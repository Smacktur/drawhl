"""Generate tiko brand assets: SVG with outlined text + PNG renders."""
import io
import sys
from pathlib import Path

import resvg_py
import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

REPO = Path(sys.argv[1])
OUT = REPO / "brand"
NM = REPO / "frontend/node_modules/@fontsource-variable"
PLEX = NM / "ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2"
MONO = NM / "jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2"

C = dict(
    brand="#096ACB", brand_d="#5FA1F3",
    dot="#A6ABB3", dot_d="#5A5F66",
    ink="#1C1F24", ink_d="#E6E8EA",
    muted="#656970", muted_d="#A3A8AF",
    bg="#F9FAFB", bg_d="#101214",
    card="#FFFFFF", card_d="#191B1E",
    border="#DFE1E4", border_d="#2B2E32",
    grid="#DCDEE0", grid_d="#25272A",
    todo_f="#E5E8EC", todo_i="#4A4D53",
    prog_f="#D9EAFF", prog_i="#17559B",
    done_f="#CCF4D3", done_i="#0B5D2A",
    sticky="#FBEBC4", sticky_d="#4A3F22",
)


class Face:
    def __init__(self, path, wght):
        tt = TTFont(path)
        tt = instantiateVariableFont(tt, {"wght": wght})
        tt.flavor = None
        buf = io.BytesIO()
        tt.save(buf)
        self.tt = TTFont(io.BytesIO(buf.getvalue()))
        self.gs = self.tt.getGlyphSet()
        self.order = self.tt.getGlyphOrder()
        self.upm = self.tt["head"].unitsPerEm
        self.hbfont = hb.Font(hb.Face(hb.Blob(buf.getvalue())))

    def shape(self, text):
        b = hb.Buffer()
        b.add_str(text)
        b.guess_segment_properties()
        hb.shape(self.hbfont, b, {"kern": True, "liga": False})
        return b.glyph_infos, b.glyph_positions

    def width(self, text, size, track=0.0):
        _, pos = self.shape(text)
        s = size / self.upm
        return sum(p.x_advance for p in pos) * s + track * size * (len(pos) - 1)

    def path(self, text, size, x, y, track=0.0):
        """SVG path d for text with baseline at y."""
        infos, pos = self.shape(text)
        s = size / self.upm
        pen = SVGPathPen(self.gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        cx = x
        for info, p in zip(infos, pos):
            name = self.order[info.codepoint]
            tp = TransformPen(pen, (s, 0, 0, -s, cx + p.x_offset * s, y - p.y_offset * s))
            self.gs[name].draw(tp)
            cx += p.x_advance * s + track * size
        return pen.getCommands()


SANS6 = Face(PLEX, 600)
SANS5 = Face(PLEX, 500)
SANS4 = Face(PLEX, 400)
MONO6 = Face(MONO, 600)

WM_TRACK = -0.03
DOTS = [(5, 5), (16, 5), (27, 5), (5, 16), (5, 27), (16, 27), (27, 27)]


def mark(card, dot, r=2.4, dot_op=1.0):
    """The Canvas emblem on a 32-unit grid: dot grid where one dot grew into a card."""
    op = f' fill-opacity="{dot_op}"' if dot_op < 1 else ""
    d = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{dot}"{op}/>' for x, y in DOTS)
    return f'<g id="emblem">{d}<rect x="10.6" y="10.8" width="18.8" height="10.4" rx="2.6" fill="{card}"/></g>'


def placed(inner, x, y, size):
    return f'<g transform="translate({x:.2f} {y:.2f}) scale({size / 32:.4f})">{inner}</g>'


def svg(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" fill="none">'
            f"<title>{title}</title>{body}</svg>\n")


def write(rel, content, png=None):
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)
    for spec in png or []:
        name, width = spec
        data = resvg_py.svg_to_bytes(svg_string=content, width=width)
        (p.parent / name).write_bytes(bytes(data))


PAL = {
    "": dict(card=C["brand"], dot=C["dot"], ink=C["ink"]),
    "-dark": dict(card=C["brand_d"], dot=C["dot_d"], ink=C["ink_d"]),
    "-mono-black": dict(card=C["ink"], dot=C["ink"], ink=C["ink"]),
    "-mono-white": dict(card="#FFFFFF", dot="#FFFFFF", ink="#FFFFFF"),
}

# Emblem: content box 32 with 0 padding; clear space is handled by the user per README.
for sfx, p in PAL.items():
    write(f"emblem/tiko-emblem{sfx}.svg", svg(32, 32, mark(p["card"], p["dot"]), "tiko emblem"),
          [(f"tiko-emblem{sfx}-512.png", 512)])


def tile(size, radius_ratio=0.22, r=2.4, scale=0.66):
    rad = size * radius_ratio
    m = size * scale
    off = (size - m) / 2
    return (f'<rect width="{size}" height="{size}" rx="{rad:.2f}" fill="{C["brand"]}"/>'
            + placed(mark("#FFFFFF", "#FFFFFF", r=r, dot_op=0.5), off, off, m))


write("app-icon/tiko-app-icon.svg", svg(512, 512, tile(512), "tiko app icon"),
      [("tiko-app-icon-512.png", 512), ("tiko-app-icon-1024.png", 1024),
       ("apple-touch-icon.png", 180), ("producthunt-thumbnail-240.png", 240)])
# Favicon: bigger dots and mark so the grid survives 16 px.
fav = svg(32, 32, tile(32, 0.22, r=3, scale=0.78), "tiko")
write("app-icon/favicon.svg", fav, [("favicon-16.png", 16), ("favicon-32.png", 32), ("favicon-48.png", 48)])


def lockup(p, h=48, x=0, y=0):
    """Horizontal logo: emblem + wordmark. Returns (svg body, width)."""
    size = h * 0.62
    gap = h * 0.24
    tw = SANS6.width("tiko", size, WM_TRACK)
    base = y + h / 2 + size * 0.36
    body = placed(mark(p["card"], p["dot"]), x, y, h)
    body += f'<path d="{SANS6.path("tiko", size, x + h + gap, base, WM_TRACK)}" fill="{p["ink"]}"/>'
    return body, h + gap + tw


for sfx, p in PAL.items():
    body, w = lockup(p)
    write(f"logo/tiko-logo{sfx}.svg", svg(round(w + 1), 48, body, "tiko"),
          [(f"tiko-logo{sfx}-1200.png", 1200)])
    size = 40
    tw = SANS6.width("tiko", size, WM_TRACK)
    W = max(tw, 64)
    stacked = placed(mark(p["card"], p["dot"]), (W - 64) / 2, 0, 64)
    stacked += f'<path d="{SANS6.path("tiko", size, (W - tw) / 2, 64 + 18 + size * 0.72, WM_TRACK)}" fill="{p["ink"]}"/>'
    write(f"logo/tiko-logo-stacked{sfx}.svg", svg(round(W + 1), round(64 + 18 + size), stacked, "tiko"))
    tw = SANS6.width("tiko", 40, WM_TRACK)
    write(f"wordmark/tiko-wordmark{sfx}.svg",
          svg(round(tw + 1), 40, f'<path d="{SANS6.path("tiko", 40, 0, 40 * 0.74, WM_TRACK)}" fill="{p["ink"]}"/>', "tiko"))


# Covers -------------------------------------------------------------------

def theme(dark):
    k = "_d" if dark else ""
    return dict(
        bg=C["bg" + k], grid=C["grid" + k], ink=C["ink" + k], muted=C["muted" + k],
        card=C["card" + k], border=C["border" + k], brand=C["brand" + k],
        dot=C["dot" + k], sticky=C["sticky" + k],
        lockup=PAL["-dark" if dark else ""],
    )


def dotgrid(w, h, t, step=24, r=1.5):
    return (f'<defs><pattern id="g" width="{step}" height="{step}" patternUnits="userSpaceOnUse">'
            f'<circle cx="{step / 2}" cy="{step / 2}" r="{r}" fill="{t["grid"]}"/></pattern></defs>'
            f'<rect width="{w}" height="{h}" fill="{t["bg"]}"/><rect width="{w}" height="{h}" fill="url(#g)"/>')


def on_grid(step):
    """Emblem height whose dots are one grid step apart."""
    return step * 32 / 11


def snap(v, step, size):
    """Nearest emblem origin to v that puts its dots on the dots of the grid."""
    first = 5 * size / 32
    return round((v + first - step / 2) / step) * step + step / 2 - first


LOZ = {"TO DO": ("todo_f", "todo_i"), "IN PROGRESS": ("prog_f", "prog_i"), "DONE": ("done_f", "done_i")}


def task_card(t, x, y, key, title, status, s=1.6, done=False):
    """Inline Jira-style card: key, title, status lozenge (DESIGN.md anatomy), scaled by s."""
    fs, ks, ls = 13 * s, 12 * s, 11 * s
    pad_x, h = 8 * s, 30 * s
    kw = MONO6.width(key, ks)
    tw = SANS4.width(title, fs)
    lw = SANS6.width(status, ls, 0.04) + 12 * s
    gap = 7 * s
    w = pad_x * 2 + kw + gap + tw + gap + lw
    base = y + h / 2 + fs * 0.35
    out = f'<rect x="{x}" y="{y}" width="{w:.1f}" height="{h:.1f}" rx="{6 * s}" fill="{t["card"]}" stroke="{t["border"]}" stroke-width="{s:.2f}"/>'
    kx = x + pad_x
    out += f'<path d="{MONO6.path(key, ks, kx, base)}" fill="{t["brand"]}"/>'
    if done:
        out += f'<rect x="{kx}" y="{base - ks * 0.33:.1f}" width="{kw:.1f}" height="{1.2 * s:.1f}" fill="{t["brand"]}"/>'
    tx = kx + kw + gap
    out += f'<path d="{SANS4.path(title, fs, tx, base)}" fill="{t["muted"] if done else t["ink"]}"/>'
    lx = tx + tw + gap
    f, i = LOZ[status]
    lh = 18 * s
    out += f'<rect x="{lx:.1f}" y="{y + (h - lh) / 2:.1f}" width="{lw:.1f}" height="{lh:.1f}" rx="{3 * s}" fill="{C[f]}"/>'
    out += f'<path d="{SANS6.path(status, ls, lx + 6 * s, y + h / 2 + ls * 0.36, 0.04)}" fill="{C[i]}"/>'
    return out, w


def board(t, x, y, s=1.6):
    """A frame with made-up tasks, a sticky note and an arrow."""
    out = f'<path d="{SANS5.path("Sprint 12", 14 * s, x, y - 8 * s)}" fill="{t["muted"]}"/>'
    fw, fh = 330 * s, 196 * s
    out += f'<rect x="{x}" y="{y}" width="{fw}" height="{fh}" rx="{6 * s}" fill="{t["card"]}" fill-opacity="0.55" stroke="{t["border"]}" stroke-width="{s * 1.2:.2f}"/>'
    rows = [
        ("DEMO-12", "Ship onboarding tour", "IN PROGRESS", False, 16),
        ("DEMO-9", "Import from CSV", "TO DO", False, 44),
        ("DEMO-4", "Dark theme", "DONE", True, 26),
    ]
    for i, (k, ti, st, dn, dx) in enumerate(rows):
        c, _ = task_card(t, x + dx * s, y + (22 + i * 44) * s, k, ti, st, s, dn)
        out += c
    sx, sy, sw = x + fw + 34 * s, y + 70 * s, 116 * s
    out += f'<rect x="{sx}" y="{sy}" width="{sw}" height="{sw}" rx="{4 * s}" fill="{t["sticky"]}"/>'
    for j, line in enumerate(["Ask design", "about empty", "states"]):
        out += f'<path d="{SANS4.path(line, 13 * s, sx + 12 * s, sy + (28 + j * 19) * s)}" fill="{t["ink"]}" fill-opacity="0.85"/>'
    ax0, ay = x + fw + 2 * s, sy + 34 * s
    out += (f'<path d="M{ax0} {y + 37 * s} H{ax0 + 16 * s} V{ay} H{sx - 6 * s}" stroke="{t["muted"]}" stroke-width="{1.5 * s:.2f}" fill="none" stroke-linejoin="round"/>'
            f'<path d="M{sx - 7 * s} {ay - 5 * s} L{sx} {ay} L{sx - 7 * s} {ay + 5 * s} Z" fill="{t["muted"]}"/>')
    return out


def cover(w, h, dark, tagline=True, scene=True, title="tiko"):
    t = theme(dark)
    body = dotgrid(w, h, t)
    lh = on_grid(24)
    left = snap(80, 24, lh)
    top = snap(h / 2 - (lh + 120) / 2 if tagline else h / 2 - lh / 2, 24, lh)
    lk, _ = lockup(t["lockup"], lh, left, top)
    body += lk
    if tagline:
        y = top + lh + 56
        for i, line in enumerate(["Open-source infinite canvas for your tasks.",
                                  "Live cards from your tracker, arranged", "the way you think."]):
            face, size, col = (SANS5, 26, t["ink"]) if i == 0 else (SANS4, 22, t["muted"])
            body += f'<path d="{face.path(line, size, left, y + (0 if i == 0 else 8) + i * 32)}" fill="{col}"/>'
        foot = "Self-hosted · AGPL-3.0 · docker compose up"
        body += f'<path d="{MONO6.path(foot, 15, left, h - 56)}" fill="{t["muted"]}" fill-opacity="0.9"/>'
    if scene:
        body += board(t, w - 480 * 1.2 - 60, h / 2 - 196 * 1.2 / 2 + 8, 1.2)
    return svg(w, h, body, title)


for dark in (False, True):
    sfx = "-dark" if dark else ""
    write(f"social/github-social-preview{sfx}.svg", cover(1280, 640, dark),
          [(f"github-social-preview{sfx}.png", 1280)])
    write(f"social/producthunt-gallery{sfx}.svg", cover(1270, 760, dark),
          [(f"producthunt-gallery{sfx}.png", 1270)])
    t = theme(dark)
    # README banner: the logo fills the height, its dots sit on the grid, cards fill the sides.
    W, H, step = 1280, 352, 44
    lh = on_grid(step)
    _, lw = lockup(t["lockup"], lh, 0, 0)
    lx, ly = snap((W - lw) / 2, step, lh), snap(58, step, lh)
    lk, _ = lockup(t["lockup"], lh, lx, ly)
    tl = "Open-source infinite canvas for your tasks"
    tw = SANS4.width(tl, 30)
    banner = dotgrid(W, H, t, step, 2)
    side = ""
    for x, y, key, title, status, done in [
        (52, 70, "DEMO-12", "Ship onboarding tour", "IN PROGRESS", False),
        (96, 136, "DEMO-9", "Import from CSV", "TO DO", False),
        (40, 246, "DEMO-4", "Dark theme", "DONE", True),
        (930, 92, "DEMO-21", "Release notes", "IN PROGRESS", False),
        (968, 248, "DEMO-17", "Fix flaky sync", "TO DO", False),
    ]:
        c, _ = task_card(t, x, y, key, title, status, 1.25, done)
        side += c
    sx, sy, sw = 1112, 136, 96
    side += f'<rect x="{sx}" y="{sy}" width="{sw}" height="{sw}" rx="5" fill="{t["sticky"]}"/>'
    for j, line in enumerate(["Ask design", "about empty", "states"]):
        side += f'<path d="{SANS4.path(line, 13, sx + 10, sy + 26 + j * 18)}" fill="{t["ink"]}" fill-opacity="0.85"/>'
    banner += f'<g opacity="0.6">{side}</g>'
    banner += lk
    banner += f'<path d="{SANS4.path(tl, 30, (W - tw) / 2, ly + lh + 74)}" fill="{t["muted"]}"/>'
    write(f"social/readme-banner{sfx}.svg", svg(W, H, banner, "tiko"), [(f"readme-banner{sfx}.png", 2560)])

# Button -------------------------------------------------------------------

def cloud_button():
    """README button for tiko Cloud. Every 6 s the card shrinks to a dot and grows back,
    then the FREE tag pops and a light band runs across it."""
    h, pad, em, gap = 40, 12, 22, 9
    bold = Face(PLEX, 700)
    parts = [(SANS4, "Start on", 15, 0.0, 0.85), (bold, "tiko", 17.5, WM_TRACK, 1), (SANS6, "Cloud", 15, 0.0, 1)]
    space = 4.5
    tag, ts = "FREE", 11
    gw = SANS6.width(tag, ts, 0.04) + 14
    gh = 20
    dur = 'dur="6s" repeatCount="indefinite"'
    frames = dict(x="10.6;10.6;13.6;10.6;10.6", y="10.8;10.8;13.6;10.8;10.8",
                  width="18.8;18.8;4.8;18.8;18.8", height="10.4;10.4;4.8;10.4;10.4",
                  rx="2.6;2.6;2.4;2.6;2.6")
    anim = "".join(
        f'<animate attributeName="{a}" values="{v}" keyTimes="0;0.66;0.74;0.84;1" {dur} '
        f'calcMode="spline" keySplines="0 0 1 1;0.4 0 0.2 1;0.2 0.8 0.2 1;0 0 1 1"/>'
        for a, v in frames.items())
    dots = "".join(f'<circle cx="{x}" cy="{y}" r="2.4" fill="#FFFFFF" fill-opacity="0.5"/>' for x, y in DOTS)
    emblem = f'{dots}<rect x="10.6" y="10.8" width="18.8" height="10.4" rx="2.6" fill="#FFFFFF">{anim}</rect>'
    text, x = "", pad + em + gap
    for face, word, size, track, op in parts:
        o = f' fill-opacity="{op}"' if op < 1 else ""
        text += f'<path d="{face.path(word, size, x, h / 2 + 15 * 0.35, track)}" fill="#FFFFFF"{o}/>'
        x += face.width(word, size, track) + space
    gx = x - space + 11
    w = round(gx + gw + pad)
    # The tag is drawn around its own centre so the pop scales in place.
    pop = (f'<animateTransform attributeName="transform" type="scale" values="1;1;1.12;1;1" '
           f'keyTimes="0;0.84;0.89;0.96;1" {dur} calcMode="spline" '
           f'keySplines="0 0 1 1;0.2 0.8 0.2 1;0.4 0 0.2 1;0 0 1 1"/>')
    band = (f'<rect x="{-gw / 2 - 12:.1f}" y="{-gh}" width="7" height="{gh * 2}" fill="{C["brand"]}" fill-opacity="0.22" '
            f'transform="skewX(-20)"><animate attributeName="x" values="{-gw / 2 - 12:.1f};{-gw / 2 - 12:.1f};{gw / 2 + 12:.1f}" '
            f'keyTimes="0;0.86;1" {dur}/></rect>')
    free = (f'<clipPath id="t"><rect x="{-gw / 2:.1f}" y="{-gh / 2}" width="{gw:.1f}" height="{gh}" rx="4"/></clipPath>'
            f'<g transform="translate({gx + gw / 2:.1f} {h / 2})"><g>{pop}'
            f'<rect x="{-gw / 2:.1f}" y="{-gh / 2}" width="{gw:.1f}" height="{gh}" rx="4" fill="#FFFFFF"/>'
            f'<path d="{SANS6.path(tag, ts, -gw / 2 + 7, ts * 0.36, 0.04)}" fill="{C["brand"]}"/>'
            f'<g clip-path="url(#t)">{band}</g></g></g>')
    body = f'<rect width="{w}" height="{h}" rx="8" fill="{C["brand"]}"/>'
    body += placed(emblem, pad, (h - em) / 2, em) + text + free
    return svg(w, h, body, "Start on tiko Cloud, free")

write("button/tiko-cloud-button.svg", cloud_button(), [("tiko-cloud-button.png", 640)])

print("done")
