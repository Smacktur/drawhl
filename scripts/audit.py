"""Launch-readiness audit of a public URL: PageSpeed scores and what crawlers see without JS.

Usage: python3 scripts/audit.py <url> [--strategy mobile|desktop] [--no-psi]
Env:   PSI_API_KEY (environment or .env) — without it Google's shared quota often answers 429.

PSI numbers are the ones https://pagespeed.web.dev/ shows: same API, same lab setup.
Exit code 1 if a crawler check fails; PSI numbers are reported, not gated.
Thresholds and how to fix: docs/playbook/11-seo.md.
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from html.parser import HTMLParser

PSI_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
CATEGORIES = ("performance", "accessibility", "best-practices", "seo")
# Core Web Vitals, "good" at p75: https://web.dev/articles/defining-core-web-vitals-thresholds
# (row, lab audit, lab limit, CrUX metric, field limit, format); TBT is the lab stand-in for INP.
METRICS = (
    (
        "LCP",
        "largest-contentful-paint",
        2500,
        "LARGEST_CONTENTFUL_PAINT_MS",
        2500,
        lambda v: f"{v / 1000:.1f}s",
    ),
    (
        "CLS",
        "cumulative-layout-shift",
        0.1,
        "CUMULATIVE_LAYOUT_SHIFT_SCORE",
        0.1,
        lambda v: f"{v:.2f}",
    ),
    (
        "TBT / INP",
        "total-blocking-time",
        200,
        "INTERACTION_TO_NEXT_PAINT",
        200,
        lambda v: f"{v:.0f}ms",
    ),
)
# Search and answer bots that must reach the page; training bots are a per-project choice.
SEARCH_BOTS = (
    "Googlebot",
    "Bingbot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "Claude-SearchBot",
    "PerplexityBot",
)
MIN_TEXT = (
    200  # characters of visible text in raw HTML; less means the page needs JS to show content
)


def fetch(url: str, timeout: float = 30) -> tuple[int, str]:
    request = urllib.request.Request(url, headers={"User-Agent": "launchpad-audit/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace")


def env(name: str) -> str:
    """Environment first, then the project's gitignored .env."""
    if value := os.environ.get(name):
        return value
    try:
        with open(".env", encoding="utf-8") as file:
            for line in file:
                key, sep, value = line.strip().partition("=")
                if sep and key == name:
                    return value.strip().strip("'\"")
    except FileNotFoundError:
        pass
    return ""


def mark(ok: bool) -> str:
    return "✅" if ok else "❌"


def psi_report(url: str, strategy: str) -> list[str]:
    query = [("url", url), ("strategy", strategy)] + [("category", c) for c in CATEGORIES]
    if key := env("PSI_API_KEY"):
        query.append(("key", key))
    status, body = fetch(f"{PSI_URL}?{urllib.parse.urlencode(query)}", timeout=180)
    if status != 200:
        message = json.loads(body).get("error", {}).get("message", body[:200]) if body else ""
        return [f"PSI failed: HTTP {status} {message}".strip()]
    data = json.loads(body)
    lighthouse = data["lighthouseResult"]
    categories = lighthouse["categories"]
    scores = " · ".join(
        f"{categories[c]['title']} **{round(categories[c]['score'] * 100)}**" for c in CATEGORIES
    )
    lines = [
        f"### PageSpeed Insights ({strategy})",
        "",
        scores,
        "",
        "| Metric | Lab | Field p75 (CrUX) |",
        "|---|---|---|",
    ]
    field = data.get("loadingExperience", {}).get("metrics", {})
    for name, lab_key, lab_limit, field_key, field_limit, fmt in METRICS:
        lab_value = lighthouse["audits"][lab_key]["numericValue"]
        field_value = field.get(field_key, {}).get("percentile")
        if field_key == "CUMULATIVE_LAYOUT_SHIFT_SCORE" and field_value is not None:
            field_value /= 100  # the API sends CLS x100
        shown = (
            "—" if field_value is None else f"{mark(field_value <= field_limit)} {fmt(field_value)}"
        )
        lines.append(f"| {name} | {mark(lab_value <= lab_limit)} {fmt(lab_value)} | {shown} |")
    if not field:
        lines += ["", "No field data: CrUX needs real traffic. Lab numbers only."]
    return lines


class PageParser(HTMLParser):
    """Collects the head tags crawlers look at and the text visible without JS."""

    def __init__(self) -> None:
        super().__init__()
        self.lang = ""
        self.title = ""
        self.meta: dict[str, str] = {}
        self.canonical = ""
        self.json_ld = False
        self.h1 = 0
        self.text: list[str] = []
        self._stack: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = {k: v or "" for k, v in attrs}
        if tag == "html":
            self.lang = a.get("lang", "")
        elif tag == "meta" and (name := a.get("name") or a.get("property")):
            self.meta[name.lower()] = a.get("content", "")
        elif tag == "link" and a.get("rel") == "canonical":
            self.canonical = a.get("href", "")
        elif tag == "script" and a.get("type") == "application/ld+json":
            self.json_ld = True
        elif tag == "h1":
            self.h1 += 1
        if tag not in ("meta", "link", "input", "br", "img"):
            self._stack.append(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag in self._stack:
            while self._stack and self._stack.pop() != tag:
                pass

    def handle_data(self, data: str) -> None:
        if "title" in self._stack:
            self.title += data
        elif "body" in self._stack and not {"script", "style"} & set(self._stack):
            self.text.append(data.strip())


def crawler_report(url: str) -> tuple[list[str], bool]:
    status, html = fetch(url)
    page = PageParser()
    page.feed(html)
    origin = "{0.scheme}://{0.netloc}".format(urllib.parse.urlsplit(url))
    robots_status, robots = fetch(f"{origin}/robots.txt")
    # SPA hosts rewrite unknown paths to index.html with 200, so check the content too.
    sitemap_status, sitemap = fetch(f"{origin}/sitemap.xml")
    has_sitemap = sitemap_status == 200 and "<urlset" in sitemap
    text = " ".join(t for t in page.text if t)
    noindex = "noindex" in page.meta.get("robots", "")
    rules = urllib.robotparser.RobotFileParser()
    rules.parse(robots.splitlines() if robots_status == 200 else [])
    blocked = [bot for bot in SEARCH_BOTS if not rules.can_fetch(bot, url)]
    # (check, passed, required): required failures fail the audit, the rest are warnings.
    checks = [
        (f"HTTP {status}", status == 200, True),
        (f"text visible without JS: {len(text)} chars", len(text) >= MIN_TEXT, True),
        (f"<title>: {page.title.strip()[:60]!r}", bool(page.title.strip()), True),
        ("meta description", bool(page.meta.get("description")), True),
        (f'<html lang="{page.lang}">', bool(page.lang), True),
        ("one <h1>", page.h1 == 1, False),
        ("canonical link", bool(page.canonical), False),
        ("og:title + og:description", {"og:title", "og:description"} <= page.meta.keys(), False),
        ("JSON-LD", page.json_ld, False),
        (f"robots.txt ({robots_status})", robots_status == 200, False),
        ("sitemap.xml with <urlset>", has_sitemap, False),
        ("no meta noindex", not noindex, False),
        (f"robots.txt blocks: {', '.join(blocked) or 'none'}", not blocked, False),
    ]
    lines = [
        "### What crawlers and AI bots see (raw HTML, no JS)",
        "",
        "| Check | Result |",
        "|---|---|",
    ]
    for name, passed, required in checks:
        lines.append(f"| {name} | {mark(passed) if passed or required else '⚠️'} |")
    return lines, all(passed for _, passed, required in checks if required)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("url")
    parser.add_argument("--strategy", choices=("mobile", "desktop"), default="mobile")
    parser.add_argument(
        "--no-psi", action="store_true", help="skip PageSpeed (e.g. for a local URL)"
    )
    args = parser.parse_args()

    lines, ok = crawler_report(args.url)
    if not args.no_psi:
        lines = psi_report(args.url, args.strategy) + [""] + lines
    print(f"## Audit: {args.url}\n")
    print("\n".join(lines))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
