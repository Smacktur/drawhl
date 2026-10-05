# Region: Russia (152-ФЗ «О персональных данных»)

Sources checked 2026-09-28: 152-ФЗ on consultant.ru (ст. 9, 12, 18, 18.1, 20, 22), приказ РКН № 128 (adequate countries), law-firm alerts for 23-ФЗ (localization, 1 Jul 2025) and КоАП 13.11 (fines from 30 May 2025). Library: `ru-152fz-2025`.

## Applies when

The service collects personal data of people in Russia, and especially when it **targets** them: Russian UI or content, marketing in Russian channels (Telegram, VK, VC.ru), ruble prices, a .ru domain. Personal data here is broad: email, name, IP, cookie ids, anything that identifies a person together with other data.

## Text requirements

Documents in **Russian** (152-ФЗ does not say so explicitly; the language law and consumer protection make it the safe default): the `ru` set (`/legal/ru/privacy/`, `/legal/ru/consent/`, `/legal/ru/terms/`); its section also goes, translated, into every other language's policy.

Policy — ст. 18.1 (publish on every site that collects data):

- [ ] оператор: имя/наименование, адрес или страна, контакт
- [ ] по каждой цели: категории данных, категории субъектов, правовое основание, действия с данными, сроки хранения и порядок уничтожения
- [ ] права субъекта (ст. 14) и срок ответа — **10 рабочих дней**, продление на 5 с уведомлением (ст. 20)
- [ ] трансграничная передача: куда (страна, получатель) и есть ли страна в перечне РКН (приказ № 128: Германия и Казахстан — да, **США — нет**)
- [ ] cookies и аналитика: что используется, зачем, как отключить (позиция РКН: cookie-идентификаторы — персональные данные)
- [ ] принятые меры защиты (ст. 18.1, 19) — кратко

Consent — ст. 9, **отдельный документ** с 1.09.2025 (156-ФЗ): не внутри политики, оферты или формы. Checkbox is accepted in practice for ordinary data (email, name) if not pre-ticked and not bundled with the Terms. Content (ч. 4), template `consent-ru.md` (processors by category — the law wants name and address; the user decides, record it):

- [ ] оператор (наименование/имя, адрес)
- [ ] цель обработки
- [ ] перечень персональных данных
- [ ] перечень действий и способы обработки
- [ ] обработчики (кому поручена обработка) и трансграничная передача
- [ ] срок действия согласия и способ отзыва
- [ ] субъект — для электронной формы идентифицируется введённым email; ФИО и паспорт из ч. 4 для веб-чекбокса на практике не собирают — **отметить юристу**

## Actions outside the documents

Stop and show these to the user — they are decisions and filings, not text:

1. **Уведомление РКН о начале обработки** (ст. 22) — before collecting, via pd.rkn.gov.ru. Exemptions (ч. 2) rarely fit a public web service. Fine for not filing: 100–300 тыс ₽ for companies and ИП (КоАП 13.11, since 30.05.2025).
2. **Уведомление РКН о трансграничной передаче** (ст. 12) — separate filing, before the transfer. Needed for any processor abroad: hosting (Render), LLM API, email, analytics. For countries **not** on the adequate list (USA) RKN may restrict the transfer.
3. **Локализация** (ст. 18 ч. 5, редакция 23-ФЗ с 1.07.2025) — **primary collection** of Russian citizens' data into a database outside Russia is prohibited; collecting abroad and copying to Russia later does not fix it. Hosting outside Russia + Russian users = violation. Options for the user: no personal data from Russian users (anonymous use only), a Russian database for the first write (Yandex Cloud, Selectel), or not targeting Russia. **Never decide this in the text** — record the user's choice.
4. **Утечка** — notify RKN within 24 hours, results of the investigation within 72 hours (ст. 21 ч. 3.1, pd.rkn.gov.ru «Инциденты»).
5. Consent log: store who agreed, to which consent version, when (the project may already do this — check).

## Section (Russian, append to `ru/privacy.md`; translate for other languages)

```markdown
### Для пользователей из России

Мы обрабатываем персональные данные в соответствии с Федеральным законом № 152-ФЗ «О персональных данных». Оператор — {{operator_name}}, {{operator_address}}.

Согласие на обработку персональных данных оформляется отдельным документом: [Согласие на обработку персональных данных](/legal/ru/consent/).

Вы можете запросить сведения об обработке ваших данных, потребовать их уточнения, блокирования или уничтожения, отозвать согласие — написав на [{{privacy_email}}](mailto:{{privacy_email}}). Мы отвечаем в течение 10 рабочих дней; срок может быть продлён на 5 рабочих дней, о чём мы сообщим с указанием причины. Вы также можете обратиться в Роскомнадзор или в суд.

Трансграничная передача: {{ru_cross_border}}

Место хранения данных: {{ru_storage_location}}
```
