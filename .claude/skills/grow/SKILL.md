---
name: grow
description: Take a shipped project to its first users — readiness check, a go-to-market strategy researched for this specific product and founder, channel kits (creator briefs that produce unique stories, sales copy variants, outreach scripts, partner pack), and a measure loop with customer interviews. Use after the pipeline reaches done (or stage is live), when the user says /grow, "продвижение", "маркетинг", "дистрибуция", "где искать пользователей", or asks how to promote the product.
---

# Grow: from shipped to used

Methodology: `docs/playbook/12-growth.md`. Everything this skill writes goes to `docs/growth/`; progress lives in `.launch/state.json` under `growth` (`step`, `experiments`). Talk to the user in their language; kits are written in each target market's language.

Steps and stops:

| Step | Output | Stop |
|---|---|---|
| 1. Context | `.agents/product-marketing.md` | user corrects it |
| 2. Readiness | checklist with evidence | only if a blocker |
| 3. Strategy | `docs/growth/gtm.md` | **G5** — pick channels and experiments |
| 4. Kit | `docs/growth/kit/` per channel | **G6** — approve before anything goes out |
| 5. Measure | `docs/growth/log.md`, `docs/growth/interviews.md` | weekly review |

Resume from `growth.step`; do not batch two stops in one turn.

## 1. Context

Run `/product-marketing` in auto-draft mode: it writes `.agents/product-marketing.md`, which every vendored marketing skill reads first. Feed it `docs/brief.md`, `docs/research.md` (competitors, voice of the user — reuse their exact words), the landing copy and README. Add two sections it does not have:

- **Positioning** (April Dunford): competitive alternatives → unique attributes → value → best-fit segment → market category.
- **Markets and languages**: which markets, which language per market, what differs (price, channels, legal).

Show the draft; the user corrects it. Every later step reads this file instead of asking again.

## 2. Readiness — check, don't ask

| Check | How | Blocker? |
|---|---|---|
| Public URL works | `make stage-smoke` or prod URL | yes |
| Crawlers see the page | `make audit` — no ❌ (`11-seo.md`) | yes for SEO/AI channels |
| Analytics | Umami script on the page; core scenario steps carry `data-umami-event` | yes — without it experiments cannot be measured |
| Legal | `docs/legal/README.md` exists, regions cover the target markets | yes for paid placements and data collection |
| Attribution | UTM convention agreed (below); ref codes if creators are paid per user | yes for creators |
| Referral mechanics | code path for ref links / payouts exists | only for per-user payouts — otherwise a `/pipeline` spec first |

UTM convention: `utm_source=<platform>` (telegram, reddit, youtube, creator-handle), `utm_medium=<type>` (post, creator, dm, directory), `utm_campaign=<experiment-id>`. One link per placement.

A blocker → say what is missing and how to fix it (often a small slice through `/pipeline`). Non-blockers → note and continue.

## 3. Strategy (G5)

1. **Interview the founder — one message**, only what `product-marketing.md` does not answer:
   - budget: money per month and hours per week;
   - access they already have: own audience, friends with audiences, communities they are a member of, past colleagues, newsletters;
   - what they tried and what happened;
   - their own ideas for channels and deals (e.g. "bloggers on a per-user fee");
   - red lines: what they will not do (cold DMs, paid ads, their own face on video…);
   - how they want to be paid, if at all (free, freemium, paid) — it decides which channels can pay back.
2. **Research — three `researcher` subagents in one message** (Sonnet / medium, see `08-models.md`). Each gets the context file, the founder's answers, the markets and its stream. Streams and output formats: `references/research-streams.md`.
   - A — where the audience lives: communities, subreddits, Telegram chats and channels, forums, newsletters — with size, activity, self-promo rules, link;
   - B — creators and partners: bloggers, podcasters, newsletter authors, complementary products — size, format, audience fit, contact route, price signals;
   - C — how competitors and analogues got their first users: launch posts, directories, referral programs, what worked by their own account.
3. **Synthesize yourself** (do not delegate): run the Bullseye scan over the 19 traction channels (`references/channels.md`) with the research, keep 3 candidates, score ICE, and turn each into an experiment:

   | Field | Example |
   |---|---|
   | id | `e1-creators-ru` |
   | hypothesis | micro-bloggers on self-development in RU Telegram bring completed sessions at < $3 each |
   | action | 5 creators × 1 native post, per-user fee |
   | budget | money + hours |
   | metric | completed sessions from their UTM / ref code (Umami) |
   | success / kill | ≥ 40 sessions and ≤ $3 each / < 10 sessions |
   | duration | 14 days |

   Write `docs/growth/gtm.md` from `templates/gtm.md`. Channel rules and legal constraints per market come from `references/channels.md` (ad marking in Russia, disclosure elsewhere, self-promo rules).
4. Spot-check: open the 3 most load-bearing links from the research yourself.
5. **G5 — stop.** Show the three experiments and ask which to run. Record the choice in `growth.experiments`.

## 4. Kit (G6)

For each approved experiment build what the channel needs in `docs/growth/kit/<experiment-id>/`. Menu, take only what the channel uses:

| Asset | How |
|---|---|
| Creator brief (story engine) | `references/story-engine.md` → `creator-brief.md`: archetypes, story structure, entry-point questions, two contrasting examples from this product, rules, CTA, disclosure. Never a script |
| Partner pack | `partner-pack.md`: offer, payout and tracking, what they get (free access, early features), rules, FAQ, contact. PDF: `/gstack-make-pdf` if available, otherwise the markdown |
| Sales copy variants | `/copywriting` with the context file: 3–5 variants per segment, each a different angle (pain, outcome, identity, contrarian, proof) — not reworded copies |
| Community posts | per community from research A: follows its rules, gives value first, discloses being the maker |
| Outreach messages | to creators and communities: personal, 3–5 sentences, one ask; one template per archetype of recipient, personalised per person |
| Deck / one-pager | only for partners or investors: 6–8 slides outline in markdown |
| Tracking table | `tracking.md`: placement → UTM link → ref code → owner |

Use the vendored skills where they fit: `/launch-strategy` (launch plan: owned / rented / borrowed channels, phases, Product Hunt day), `/influencer-marketing` (deal terms, disclosure, vetting), `/referrals` (per-user payouts, fraud), `/community-marketing`, `/directory-submissions`, `/customer-research`, `/ai-seo` (UI projects).

Every text for people goes through `/humanizer` if it is installed; otherwise follow its rules: no inflated claims, no "unlock", no rule-of-three filler, concrete details.

Code needs (vanity landing per creator, ref links, promo codes, new Umami events) → do not write code here: list them and hand off to `/pipeline` as a slice.

**G6 — stop.** Show the kit per experiment; nothing is sent or published by the agent. The user sends, posts and signs deals.

## 5. Measure

Weekly, or when the user asks:

1. Pull numbers per experiment from Umami (API with `UMAMI_API_KEY`, or ask the user for a dashboard screenshot): visits, core-scenario events, conversions by `utm_campaign` / ref code.
2. Append to `docs/growth/log.md` (`templates/log.md`): date, experiment, numbers, cost, verdict against its success / kill line — **double down / iterate / kill**.
3. **Customer interviews** (The Mom Test): script from `templates/interview-script.md`; after each conversation, notes in `docs/growth/interviews.md`. Every 5 interviews synthesize with `/customer-research` (mode 1) into pains, words, objections.
4. Findings that change the product → brief and `/pipeline`; findings that change messaging → `.agents/product-marketing.md` and the kit.
5. A channel that works → next experiment on the same channel with a bigger budget; nothing works after 3 rounds → back to G5 with what was learned.

At the end of a cycle offer `/retro` so the channel results reach the launchpad library.

## Rules

- No fake reviews, sockpuppets, bought upvotes, or posting as a user without saying you are the maker.
- Paid or rewarded mentions are advertising: disclosure everywhere; in Russia also «Реклама» + ERID via an ОРД (`references/channels.md`).
- Creators tell their own true story after actually using the product. We give structure and freedom, never a text to paste.
- Nothing leaves the repo without the user: the agent drafts, the user sends.
