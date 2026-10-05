# Region: United States (CalOPPA, COPPA, CCPA, state privacy laws)

## Applies when

Almost always for an English-language service: CalOPPA covers any commercial site that collects personal information from California residents, regardless of size.

## Text requirements (Privacy Policy)

- [ ] categories of personal information collected and third parties it is shared with (CalOPPA; base table and processors)
- [ ] how a user can review and request changes to their data (base: "Your rights")
- [ ] how changes to the policy are announced and the effective date (base: "Changes", header)
- [ ] response to Do Not Track and Global Privacy Control signals (CalOPPA; section below)
- [ ] no sale or sharing of personal information, or an opt-out link if there is (CCPA)
- [ ] children under 13 (COPPA; base: "Children")

## Actions outside the documents

- **CCPA thresholds** (for-profit business): annual revenue above the current CPPA threshold (USD 26.625M for 2025), or buys, sells or shares personal information of 100,000+ California consumers or households, or earns 50%+ of revenue from selling or sharing it. Most MVPs are below — record it. Above → full CCPA notice at collection, "Do Not Sell or Share" link, rights request process. Source: <https://cppa.ca.gov/faq.html>.
- **Other state laws** (Virginia, Colorado, Connecticut, Texas and others) have similar or higher thresholds; the section below is written to satisfy their common core (no sale, no targeted advertising, rights on request).
- **Advertising pixels or selling data** change everything above: stop and tell the user.
- **Children:** the service must not be directed at children under 13. If it is, COPPA requires verifiable parental consent — out of scope, stop.

## Section (English, append to the Privacy Policy)

```markdown
### If you are in the United States

We do not sell your personal information or share it for cross-context behavioral advertising, and we do not use it for targeted advertising. California and other US state residents have the right to know what we collect, to access, correct and delete it, and to opt out of sale or sharing; we honor these rights for everyone and will not treat you differently for using them.

We do not track you across other sites, so Do Not Track and Global Privacy Control signals have nothing to switch off; we honor them by default.
```
