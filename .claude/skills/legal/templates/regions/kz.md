# Region: Kazakhstan (Закон РК № 94-V «О персональных данных и их защите»)

Sources checked 2026-09-28: law text via kodeksy-kz.com mirrors (ст. 8, 12, 16) — adilet.zan.kz did not render for the agent; rules on breach notification (adilet V2400034919); law-firm alerts for the 2026 amendments (Baker McKenzie, Morgan Lewis). Article-level wording is **not** checked against adilet directly — lawyer review recommended.

## Applies when

The service collects personal data of people in Kazakhstan: Russian or Kazakh UI, marketing in Kazakh channels, tenge prices, a .kz domain.

## Text requirements

Documents in Russian are shared with the RU region (`ru/privacy.md`, `ru/consent.md`). Kazakh-language versions may be required by the consumer protection and language laws (information in one language only "is deemed not provided" for consumer information) — whether this covers a foreign online service is unclear: **ask the user / lawyer**, record the decision.

Consent — ст. 8: written, via a service, or **any other way that proves it was received** (a logged, unticked checkbox fits the wording; no regulator guidance). Content (ст. 8 ч. 4) — the shared consent from `consent-ru.md` covers it if it names:

- [ ] оператор (наименование, идентификатор — БИН/ИИН, если есть)
- [ ] субъект (для веб-формы — введённый email)
- [ ] срок действия согласия
- [ ] передача третьим лицам — кому
- [ ] **трансграничная передача** — в какие страны
- [ ] распространение в общедоступных источниках — нет
- [ ] перечень собираемых данных

Policy: no explicit publication duty found; publish the shared Russian policy with this section anyway (consent must be informed).

## Actions outside the documents

1. **Локализация** (ст. 12 п. 2): personal data is stored "в базе, находящейся на территории Республики Казахстан". No enforcement practice found against foreign online services without a Kazakh entity — an open risk, same decision set as Russia: no personal data, a database in Kazakhstan, or not targeting. Record the user's choice.
2. **Трансграничная передача** (ст. 16): free to countries with adequate protection; otherwise only with the subject's consent — so the consent must name the countries (USA for most LLM APIs).
3. **Реестр операторов** (поправки, с 25.08.2026): notification duty only for large operators (≥ 500 000 subjects; one tier higher with biometric or health data). A small service is below — record it.
4. **Утечка** — notify the authorized body (МЦРИАП) within 1 working day and the affected people.
5. Requests: reported deadlines — 3 working days for information, 15 working days to stop processing after consent withdrawal (not checked against the primary text).

## Section (Russian, append to `ru/privacy.md`; translate for other languages)

```markdown
### Для пользователей из Казахстана

Мы обрабатываем персональные данные в соответствии с Законом Республики Казахстан «О персональных данных и их защите». Согласие оформляется [отдельным документом](/legal/ru/consent/) и может быть отозвано письмом на [{{privacy_email}}](mailto:{{privacy_email}}).

Трансграничная передача: {{kz_cross_border}}

Место хранения данных: {{kz_storage_location}}
```
