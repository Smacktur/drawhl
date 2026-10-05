# Region: EU / EEA / UK (GDPR, UK GDPR, ePrivacy)

## Applies when

The service is offered to people in the EU/EEA or UK (English UI counts; any EU marketing, EU payments or EU language makes it certain), or the operator is established there.

## Text requirements (Privacy Policy)

GDPR Art. 13 — every item present or marked not applicable:

- [ ] controller identity and contact (base: "Who we are"); EU representative if required (below)
- [ ] purposes **and legal basis per purpose** (base table, "Legal basis" column: consent Art. 6(1)(a), contract 6(1)(b), legal obligation 6(1)(c), legitimate interests 6(1)(f))
- [ ] the legitimate interest named where 6(1)(f) is used
- [ ] recipients / processors (base: "Who we share data with")
- [ ] transfers outside the EEA and the safeguard (section below)
- [ ] retention per category (base table)
- [ ] rights: access, rectification, erasure, restriction, objection, portability; withdrawing consent
- [ ] right to complain to a supervisory authority
- [ ] whether providing data is required and what happens if not
- [ ] automated decision-making, including profiling (Art. 22) — state "none with legal or similarly significant effect" when true

## Actions outside the documents

- **Cookies / local storage** (ePrivacy Art. 5(3)): anything not strictly necessary for what the user asked needs prior consent. Session id, UI preferences, cookie-less analytics — no banner. Advertising pixels, cross-site analytics — consent banner first. Stop and tell the user.
- **Processor agreements (Art. 28):** each processor (hosting, email, LLM, analytics) has a DPA — usually part of their terms. List them in the record with a link.
- **EU representative (Art. 27):** a controller outside the EU that targets EU users must appoint one, unless processing is occasional, low-risk and excludes special categories. Solo MVPs usually rely on the exemption — record the decision; the user confirms.
- **Transfers:** for processors outside the EEA, check the safeguard: EU–US Data Privacy Framework certification of the provider, or Standard Contractual Clauses in its DPA.

## Section (English, append to the Privacy Policy)

```markdown
### If you are in the EU, EEA or UK

We process your data on the legal bases listed in the table above. Where we rely on legitimate interests, it is to keep the service working, secure and improving; you can object at any time.

You also have the right to data portability and to lodge a complaint with the data protection authority of your country of residence or work. We would appreciate the chance to address your concern first.

Some of our providers are located outside the EEA. {{eu_transfer_safeguards}}

We do not make decisions about you based solely on automated processing that have legal or similarly significant effects.
```
