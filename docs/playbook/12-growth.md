# 12. Growth: from release to first users

A product in prod does not mean the product is used. Distribution is as much a part of the work as code, and we start thinking about it at intake (the "Channel" line in `docs/brief.md`). The `/grow` skill drives it, results go to `docs/growth/`.

## Cycle

| Step | What | Artifact | Stop |
|---|---|---|---|
| 1. Context | positioning, ICP, user wording, markets and languages | `.agents/product-marketing.md` | author edits |
| 2. Readiness | URL, `make audit`, Umami events, legal, UTM, referral mechanics | checklist | blockers only |
| 3. Strategy | author interview → 3 researchers (audience, bloggers, analogues) → Bullseye → 3 experiments | `docs/growth/gtm.md` | **G5** |
| 4. Materials | blogger brief (story engine), partner package, copy, posts, messages, tracking | `docs/growth/kit/<experiment>/` | **G6** |
| 5. Measurement | numbers per experiment, decision to double down / rework / close; customer interviews | `docs/growth/log.md`, `interviews.md` | weekly |

## Principles

- **A strategy for this project, not generic advice.** Input: the project research, the author's answers (budget, time, access, ideas, red lines) and fresh search across its markets. Every channel in the plan comes with links to specific communities, bloggers and analogue case studies.
- **An experiment, not "let's try".** Each has: hypothesis, action, budget, metric, success threshold, close threshold, deadline (usually 14 days). Three channels in parallel, then double down on the one that worked (Bullseye).
- **Count activation, not reach.** Success means users who reach the end of the core scenario (Umami event), by the channel's UTM or referral code. Likes and impressions are not a metric.
- **Bloggers tell their own story.** Give them a method (story engine: archetypes, entry-point questions, six beats of a post, rules), not a script. The blogger goes through the product first; the post contains an artifact from their session and an honest caveat. Overlapping audiences get different archetypes.
- **The agent prepares, the human sends.** Posts, emails, deals and publications are done by the author.
- **Honesty is a condition for a channel to work.** Disclose advertising everywhere; in Russia: "Reklama" ad label + ERID via an ORD before publication. No inflated numbers, fake reviews or sockpuppet accounts.

## Code for growth

Anything that needs code (referral links and payouts per user, landing pages per segment or blogger, promo codes, new events) goes as a slice through `/pipeline`, with a spec and tests. `/grow` only formulates the requirement.

## Open-source project (profile `oss`)

Same cycle, different channels and metrics:

- **Channels:** README as a landing page (screenshot or GIF above the fold, quick start in 2 commands), repository topics, awesome lists of the niche, Show HN, relevant subreddits and forums, Habr, dev.to, communities around integrated products (Atlassian forums, Obsidian, etc.), release notes as a reason to post.
- **Activation:** not stars but installs and return visits: GHCR image pulls, issues and discussions from strangers, repeat mentions. The product has no telemetry, so a survey of first users and an issue template "How do you use it?" replace analytics.
- **Community:** reply to the first issue within a day, a `good first issue` label on 3–5 tasks, CONTRIBUTING without barriers. The first external PR matters more than a hundred stars.
- **We do not:** inflate stars, spam other people's issues, or write "we are better than X" posts without a fact-based comparison.

## Customer development

The Mom Test: ask about past behavior, not opinions about the idea. Every 5 interviews, synthesize pains, wording and objections; put conclusions in the brief (product) or in `.agents/product-marketing.md` (messaging).

## Skills

`/grow` is the conductor. Narrow tasks use the vendored [marketingskills](https://github.com/coreyhaines31/marketingskills) skills (MIT): `/product-marketing`, `/customer-research`, `/copywriting`, `/influencer-marketing`, `/referrals`, `/community-marketing`, `/directory-submissions`, `/launch-strategy` (launch plan, Product Hunt; the upstream skill is `launch`, renamed to avoid confusion with launchpad's `/launch`), `/ai-seo` (if there is a UI). All of them read `.agents/product-marketing.md`, so step 1 is mandatory. Texts for people go through `/humanizer`, if installed.

## Experience

What worked and what it cost goes into `/retro`: the launchpad library accumulates channels by product type and market.
