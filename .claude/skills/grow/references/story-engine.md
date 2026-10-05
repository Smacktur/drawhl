# Story engine: creator briefs that produce unique stories

Goal: each creator tells **their own true story** in which the product plays a natural part. We give a method and a structure, never a text. Ten creators → ten different posts, none of which reads like an ad template.

Why: scripted reads convert worst, audiences recognise copy-paste campaigns within hours (and it looks like astroturfing), and identical texts get flagged by platforms. Uniqueness is not decoration — it is what makes the channel work.

## The brief the creator receives (`creator-brief.md`)

Short. A creator reads it in five minutes. Sections, in this order:

1. **What the product is — one sentence**, plus who it is for. No feature list.
2. **Try it first.** Free full access (code or account). The story is built from their own session — this is non-negotiable: no session, no post.
3. **Pick an archetype** (below) — the one closest to how they already talk to their audience.
4. **Find your entry point** — the question bank (below). They answer 3–4 for themselves; the answers are the raw material.
5. **Story structure** — the six beats (below).
6. **Two contrasting examples** written for this product in two different archetypes, labelled "examples of structure — do not reuse sentences".
7. **Rules** — what must and must not be in the post.
8. **CTA and tracking** — their personal link or code, what the audience gets.
9. **Disclosure** — exact wording for their market and platform.
10. **Deal** — payout, reporting, timing, contact.

## Archetypes

Each is a different reason for the post to exist. The product is never the reason — the creator's story is.

| Archetype | The post is about | Fits creators who | Where the product enters | Failure mode |
|---|---|---|---|---|
| **Confession** | a moment they were stuck, lost, overwhelmed | share personal life openly | the tool they tried when they stopped waiting for clarity | melodrama; the product "saved my life" |
| **Experiment** | "I tried X for N days / once, here is what happened" | test things, review, measure | the thing being tested, with a honest result | fake precision, only positives |
| **Observation** | someone else: a friend, a follower, a client, a pattern they keep seeing | coach, teach, comment on society | what they suggested to that person, or tried to understand them | inventing the person |
| **Contrarian** | a popular belief they disagree with | have opinions, debate | evidence or a way to test their point | attacking the audience |
| **How I do it** | their own process for a decision or habit | educate, show routines | one step of their process | turning into a tutorial for the product |
| **Ask the audience** | a question to followers, a poll, a challenge | run interactive formats | the thing everyone can try and share results | forced participation |

Distribution rule: creators with overlapping audiences get **different** archetypes. Track it in `tracking.md` (column "archetype").

## Finding the entry point — question bank

The creator answers 3–4 of these for themselves before writing. We adapt the list to the product; these are the defaults:

1. When did you last face the problem this product deals with? What exactly happened?
2. What did you do about it then, and what did it cost you (time, money, nerves)?
3. What surprised you in your own session with the product? Quote something it showed you.
4. What would you tell a friend in the same situation, in one sentence?
5. What do your followers ask you most often that connects to this?
6. What do you disagree with in how people usually approach this problem?
7. What did the product get wrong or not do for you? (An honest caveat makes the rest believable.)
8. What changed after — a decision, a conversation, a first step? If nothing yet, say so.

The answers to 3 and 7 are required: they force a specific detail and an honest limit, which templates never have.

## Six beats of a native post

1. **Hook from their life** — tension, a scene, a question. Not the product.
2. **Context** — why this matters to them and to this audience.
3. **Turn** — what they tried; the product appears here as a tool, among the things they did.
4. **Specific artifact** — something from their own session: a screenshot, a phrase the product produced, their result. This is what makes each post unique.
5. **Honest caveat** — what it did not do, who it is not for.
6. **Soft CTA + disclosure** — what the audience can try, their link or code, the ad label.

Length and form follow the platform (a Telegram post, a Reels script with beats as shots, a YouTube integration of 60–90 seconds, a newsletter paragraph). The beats stay.

## Rules for the creator

Must:

- use the product before posting and show their own artifact;
- keep their voice, format and language; tone is theirs;
- disclose the partnership in the platform's way and, for paid placements in Russia, with «Реклама» and ERID;
- use only their personal link or code.

Must not:

- copy sentences from the examples or from other creators;
- claim results they did not get, or invent people and quotes;
- promise what the product does not do (the brief lists the claims that are true);
- present it as unpaid advice when it is paid;
- post outside the agreed channels or spam comments.

Forbidden phrases — the ones that make every sponsored post look the same: "changed my life", "game-changer", "I can't recommend it enough", "link in bio, go go go", "unlock your potential", "you won't believe". Add product-specific clichés.

## Contrasting examples

Write two per brief, for **this** product, in two different archetypes and, if possible, two platforms. Each 80–150 words, marked with its beats. They show the structure; the creator must not reuse sentences. Generate them from `.agents/product-marketing.md` and real user words from `docs/research.md`; run through `/humanizer`.

## Reviewing a draft (if the deal includes approval)

Check only: facts about the product are true, disclosure is present, link or code is theirs, no forbidden phrases, the artifact is real. Do not rewrite their voice. One round of comments.

## Deal patterns

| Model | When | Tracking |
|---|---|---|
| Per activated user (CPA), e.g. $2–3 per completed core scenario | creators confident in their audience; product has a clear activation event | ref code or UTM → Umami event, payout table |
| Flat fee | awareness, larger creators who will not take CPA | UTM for measurement, not payout |
| Hybrid (small flat + CPA) | the usual best deal for micro creators | both |
| Free access / barter | nano creators, genuine fans | UTM |
| Revenue share | paid products, long partnerships | payment provider or affiliate tool |

Per-user payouts need anti-fraud: count only activated users (completed scenario), cap per day, hold payout for a period, reserve the right to exclude obvious fraud. `/referrals` has the detail.
