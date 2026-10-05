---
name: legal
description: Draft the baseline legal documents before production — a Privacy Policy and Terms of Service built from the project's real data flows, with regional sections for the US, EU/UK, Russia and Kazakhstan, a separate Russian consent document, and a checklist of filings and infrastructure decisions outside the text. Use in the pipeline's legal phase, when the user says /legal, or when data collection, processors, payments or target markets change.
---

# Legal baseline: base documents + regions

One Privacy Policy and one Terms of Service describe what **this** project actually does; regional modules add what each jurisdiction requires. Templates are next to this file:

| File | What |
|---|---|
| `templates/privacy-policy.md` | base policy (English), `{{regional_sections}}` slot |
| `templates/terms-of-service.md` | base Terms (English) |
| `templates/consent-ru.md` | separate consent document — RU (152-ФЗ ст. 9) and KZ (94-V ст. 8); in Russian, translated for every other UI language |
| `templates/regions/<code>.md` | per region: when it applies, text checklist, **actions outside the documents**, section to append |
| `templates/record.md` | `docs/legal/README.md` — the facts behind the documents |

Regions: `us`, `eu` (EU/EEA/UK), `ru`, `kz`. A new region = a new file in `regions/` with the same four parts.

## OSS mode (profile `oss` in `.copier-answers.yml`)

Self-hosted software has no operator collecting user data, so no Privacy Policy or Terms for the product itself. Instead:

1. **Project license.** `LICENSE` matches `license` in `.copier-answers.yml`; the copyright line is right.
2. **Dependencies.** `make licenses` passes; every direct dependency is in `THIRD_PARTY.md` with its license. Apache-2.0 dependencies that ship a `NOTICE` → carry it into a `NOTICE` file. Copied code, icons, fonts, datasets → license and attribution in `THIRD_PARTY.md`.
3. **README Privacy section** from the code (inventory as in step 1 below): what the software stores and where, which external services it talks to and with what data, that there is no telemetry (or exactly what and how to turn it off).
4. **Trademarks.** Third-party names (Jira, Confluence, …) only to describe compatibility, no logos in the repo, a line in README: "not affiliated with or endorsed by <owner>".
5. **Hosted demo or managed service** run by the maintainers → that instance collects visitor data: do the full flow below for it.

Record the result in `docs/legal/README.md` (license, dependency check date, Privacy section, trademark notes, demo yes/no) and stop for the user's confirmation.

This is a drafting aid, not legal advice. Every output carries that disclaimer, and the user decides whether a lawyer reviews it before launch.

## 1. Gather facts — read, don't ask

- `docs/brief.md` — users, markets, core scenario, payments in Must/Should/Won't, planned marketing channels (they decide "targeting").
- `.copier-answers.yml` — `llm`, `frontend`, `ui_lang`.
- Data the code stores or sends: `rg -n 'email|name|phone|address|ip|user_id|token|consent' backend/app` plus models, schemas, storage adapters; forms (`rg -n '<form|<Input|type="email"' frontend/src`); browser storage (`rg -n 'localStorage|sessionStorage|document.cookie' frontend/src`).
- Processors and their countries: `render.yaml` (hosting, `region`), `UMAMI_WEBSITE_ID`, `THIRD_PARTY.md` (LLM provider, APIs), email and payment services.
- Existing `docs/legal/README.md` — on a rerun, change only what moved and bump the dates.

Write the data inventory before any prose: data | where collected | purpose | legal basis | retention | shared with (country).

## 2. Ask the user — one message

Only what the facts cannot tell:

- Operator: company or individual, legal name, country, address (RU/KZ consent needs it), registration id if any, privacy contact email.
- Markets: which of US, EU/UK, Russia, Kazakhstan — propose from the brief and channels, the user confirms.
- Minimum age (default 16; never directed at children under 13).
- Retention per data type, if the code has no deletion job: "until you ask to delete" or a period plus a task to implement it.
- Processor settings that change the text: does the LLM provider train on inputs, which email provider.
- Governing law and venue for the Terms (default: operator's country).

## 3. Decisions outside the text — stop before drafting

For every selected region read its `regions/<code>.md` → "Actions outside the documents". Show the user a table: action | why | options | who. The typical blockers:

- **RU / KZ localization:** data of Russian or Kazakh citizens stored outside the country. Options: no personal data from those users, a local database for the first write, or not targeting the country. The user decides; record it. Do not draft a sentence that claims compliance the infrastructure does not have.
- **RU filings:** RKN notification of processing and of cross-border transfer.
- **EU:** consent banner if non-essential cookies; EU representative (Art. 27) exemption.

Continue once the user has chosen; unresolved items go to the record as open risks.

## 4. Draft

1. **Base.** Copy `privacy-policy.md` and `terms-of-service.md`, fill every `{{placeholder}}`, keep `<!-- if X -->…<!-- end -->` blocks only when X is true and remove the markers, delete the header comment.
2. **Regions.** Append each selected region's section into `{{regional_sections}}` (English policy: `us`, `eu`); tick its text checklist — every item present or explicitly not applicable.
3. **One full set per UI language** (English always; Russian when RU or KZ is selected or the UI has Russian): `privacy`, `terms`, `consent` (processing consent from `consent-ru.md`), `consent-emails` (marketing consent, only if the project sends such emails). Every set carries the same facts and **every** selected region's section, translated — not a looser translation, and no second language inside a document. No per-IP versions: geolocation is wrong for VPN users and travellers, and regulators and reviewers must see the full text; IP may later only highlight the reader's section.
   - **Processors by category, never by vendor name**: hosting provider, AI service providers, email delivery provider, analytics provider, payment provider — with their countries. Real names stay in `docs/legal/README.md`. 152-ФЗ ст. 9 ч. 4 п. 6 formally wants the processor's name and address in the consent: tell the user, record their decision.
   - **Cookies**: describe strictly necessary cookies and browser storage generically (session, sign-in, security, payments) so accounts and payments fit later without a banner; never claim "no cookies". Advertising or cross-site cookies → stop, step 5.
4. Plain language, short sentences, no invented facts: never promise a practice the code does not follow (a deletion period without a job that deletes, "no training" when the provider setting is unknown).
5. Output location:
   - with `frontend/`: `frontend/src/legal/<lang>/<name>.md` — the build publishes each at `/legal/<lang>/<name>/` as a static page with `<html lang>` set (`frontend/scripts/prerender.js`);
   - without: `docs/legal/<lang>/<name>.md`.
6. **Record:** `docs/legal/README.md` from `templates/record.md` — inventory, processors with countries, regions, the decisions from step 3, open risks, template version, review status.

## 5. Wire it in (frontend)

- Footer on every app page: links to all documents of the current UI language. Open them in a dialog so a half-filled form survives; the `href` stays the static page.
- Next to any form that collects personal data: an **unticked** checkbox per consent purpose, not bundled with accepting the Terms, linking that purpose's consent document in the current UI language; store who agreed, which consent version, when.
- Cookies or storage beyond strictly necessary → stop: EU and RU both need prior consent.
- `cd frontend && npm run build`, then check `dist/legal/*/*/index.html` exist and render the text.

## 6. Stop

Show: the inventory, the regions, the actions table with the user's decisions, open risks and the disclaimer. Recommend a lawyer review before paid or public launch — per region; the user decides. Set `gates.legal` in `.launch/state.json` to `drafted` (or `reviewed`) and commit with the documents.

## When to rerun

New data field or form, new processor or country, accounts or payments added, a new market or marketing channel, or a new template version via `launch update` (compare `template-version` with `docs/legal/README.md`). Review at least yearly — RU and KZ law changes every year.
