# Channels: the Bullseye list and rules per market

## Bullseye scan

From *Traction* (Weinberg, Mares) — <https://medium.com/@yegg/the-bullseye-framework-for-getting-traction-ef49d05bfd7e>. For each channel write one line: "the best experiment we could run here". Then keep 3 candidates, score ICE, run cheap tests in parallel, double down on the one that works.

| # | Channel | Typical first experiment for a small product |
|---|---|---|
| 1 | Viral / referral loops | share of a result (image, link) built into the core scenario |
| 2 | Public relations | a story to niche media or a Telegram channel editor |
| 3 | Unconventional PR | a stunt, a free tool, a public dataset |
| 4 | Search engine marketing | small paid search test on high-intent queries |
| 5 | Social and display ads | Telegram Ads / Meta / TikTok test on one segment |
| 6 | Offline ads | rarely for early web products |
| 7 | SEO and AI search | landing pages per intent, FAQ answers (`11-seo.md`, `/ai-seo`) |
| 8 | Content marketing | articles on VC.ru / Habr / Medium from real user insights |
| 9 | Email marketing | follow-ups to people who left an email |
| 10 | Engineering as marketing | a free mini-tool on its own URL |
| 11 | Targeting blogs / creators | story engine briefs (`story-engine.md`) |
| 12 | Business development | integration or cross-promo with a complementary product |
| 13 | Sales | direct outreach — for B2B |
| 14 | Affiliate programs | per-user payouts to creators or partners (`/referrals`) |
| 15 | Existing platforms | Product Hunt, Telegram catalogs, app directories (`/directory-submissions`) |
| 16 | Trade shows | rarely early |
| 17 | Offline events | meetups, talks where the ICP gathers |
| 18 | Speaking engagements | podcasts, streams, webinars |
| 19 | Community building | own chat or channel around the problem (`/community-marketing`) |

ICE: Impact, Confidence, Ease, 1–10 each; sort by the product. Library: `ice-scoring`.

## Russia and CIS

- **Ad marking (Russia, law on advertising, since 1 Sep 2022).** Paid or rewarded placements for a Russian audience — blogger integrations, paid Telegram posts, seeding — need the label «Реклама», the advertiser's name and an ERID token from an accredited ОРД, obtained **before** publication; creatives are reported to ЕРИР. The boundary for rev-share-only or per-user payouts is not settled in public sources — treat any compensation as advertising and check with the ОРД. Sources: <https://vc.ru/id5657117/2772540-markirovka-internet-reklamy-2026>, <https://cleverdata.ru/blog/statii/markirovka-internet-reklamy-erir-ord-erid>.
- **Telegram:** channel catalogs and stats — tgstat.ru, telemetr.io; ad exchanges like telega.in (posts from ~500 ₽ in small channels to 50 000 ₽+ in large, ~10% commission — <https://elama.ru/blog/obzor-interfeysa-birzhi-telegram-kanalov-telega-in/>); Telegram Ads for tests. Direct deals with channel owners are common; marking still applies.
- **VC.ru, Habr, Pikabu:** content channels with their own self-promo rules — read the platform rules before posting; product announcements usually belong in designated sections, value-first articles perform better. Check rules per post.
- **Kazakhstan:** the Russian-language channels above reach KZ audiences; local marking rules differ — check before paid placements.
- **Payments for partners from CIS:** Stripe-based affiliate tools (PromoteKit, Rewardful, FirstPromoter) are hard to use for RU; default to ref codes + a payout table and payouts by the founder.

## Global (English)

- **Disclosure (US FTC, UK ASA / CMA, EU consumer law):** any material connection — payment, free product, commission — disclosed clearly where the audience sees it ("#ad", platform "paid partnership" label, spoken in video). `/influencer-marketing` has the detail.
- **Reddit:** communities set their own rules; common norms — mostly non-promotional participation, disclose being the maker, no alt accounts or vote manipulation. Read each subreddit's sidebar. <https://redship.io/blog/reddit-self-promotion-rules>
- **Hacker News:** Show HN for things people can try; not a promotion channel, no vote requests. <https://news.ycombinator.com/showhn.html>
- **Product Hunt and directories:** maintained list — <https://github.com/DirectorySurf/awesome-launch-platforms>; process — `/directory-submissions`.
- **Indie Hackers:** maker-friendly; product posts in the designated format.

## Anti-patterns

Buying reviews or upvotes, sockpuppets, posting the same text across communities, DMs to people who did not opt in at scale, hiding that a post is paid, creators posting without using the product. They burn the channel and in several markets break the law.
