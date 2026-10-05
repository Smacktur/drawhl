# Research — drawhl: open-source холст с живыми карточками Jira Data Center

> Дата: 2026-10-05 · Timebox: ~25 мин (4 потока параллельно) · Рекомендация: **go** (как личный инструмент лида, self-hosted, Jira DC)

## TL;DR

- Карточки Jira на доске уже продают Miro, Lucidspark и Mural, в том числе для Data Center. Atlassian Whiteboards и FigJam работают только с Cloud. Открытого self-hosted решения "холст + живые карточки Jira DC" не нашли.
- Самая подтверждённая боль — устаревшие карточки. В Miro статус не обновляется сам, приходится вручную нажимать update или пересоздавать карточку. Треды висят годами.
- Спрос на доски в DC есть (137 голосов за `CONFSERVER-83249`, Atlassian делать не планирует), но речь там о командной работе. Под нашу персону ("мыслю пространственно, канбан не подходит") прямых цитат нет, это гипотеза.
- Движок: tldraw отпадает из-за лицензии, живых форков эпохи Apache нет. Лучше всего подходит xyflow (React Flow, MIT): карточка как React-узел, группы и стрелки с привязкой есть из коробки. Свободное рисование придётся дописать самим.
- Первым делом строим карточку Jira DC по ключу через PAT, которая обновляется сама (опрос раз в 30–60 с), плюс frames и перетаскивание.

## Решения и конкуренты

| Продукт | Что делает | Модель / цена | Сильное | Слабое (по отзывам) | Ссылка |
|---|---|---|---|---|---|
| Miro + Jira Cards | Карточки Jira на доске, Cloud, Server и DC | SaaS, Starter $8, Business $20 за участника в месяц | Ближе всех по функциям, есть DC через OAuth 2.0 и вебхуки | Статус не обновляется сам, нужен ручной update по каждой карточке, просят "Refresh all". Для DC нужен админ. Доска тяжелая и медленная | [Jira Cards](https://help.miro.com/hc/en-us/articles/360017572434-Jira-Cards), [не обновляются](https://community.miro.com/ask-the-community-45/jira-cards-are-not-updating-18974), [идея status update](https://community.miro.com/ideas/important-feature-for-jira-integration-status-update-4403), [цена](https://comparedge.com/tools/miro/pricing) |
| Lucidspark + Lucid Cards for Jira | Импорт задач Cloud и DC, двусторонняя синхронизация | SaaS, цена не проверена | Двусторонняя синхронизация | Для DC настройку делает админ (OAuth) | [help](https://help.lucid.co/hc/en-us/articles/14943046626964-Integrate-Lucid-Cards-with-Jira), [admin](https://help.lucid.co/hc/en-us/articles/14942710266516-For-admins-Configure-Lucid-Cards-for-Jira) |
| Mural | Карточки Jira, двусторонняя и массовая синхронизация, есть DC | SaaS, цена не проверена | DC поддерживается | Интеграция с Server в статусе legacy | [Mural Jira](https://www.mural.co/integrations/jira), [Server legacy](https://support.mural.co/s/article/using-the-jira-server-integration) |
| Confluence Whiteboards | Нативные доски с карточками Jira | Входит в Confluence Cloud | Нативно, стикер превращается в задачу | Только Cloud, для DC не планируется. Карточку нельзя ресайзить или менять стиль | [docs](https://support.atlassian.com/confluence-cloud/docs/link-jira-issues-from-your-whiteboard/), [CONFSERVER-83249](https://jira.atlassian.com/browse/CONFSERVER-83249), [resize](https://community.atlassian.com/forums/Confluence-questions/Resize-or-Stretch-the-Display-Cards-ticket-from-Jira-in/qaq-p/2630727) |
| FigJam + виджет Jira | Виджет Jira на доске | Входит в Figma | Экосистема дизайнеров | Только Cloud, on-prem не планируется | [widget](https://www.figma.com/community/widget/1094001923188252679/jira), [forum](https://forum.figma.com/suggest-a-feature-11/widget-for-figjam-to-jira-server-integration-27867) |
| Easy Agile TeamRhythm, StoriesOnBoard | Story map поверх бэклога Jira | Easy Agile $10 в месяц за 10 человек, SoB $9–55 за пользователя | Есть Server и DC | Жесткая сетка, свободного холста нет | [Easy Agile](https://marketplace.atlassian.com/apps/1212078/easy-agile-teamrhythm-user-story-map-retrospectives), [SoB](https://www.capterra.com/p/138042/StoriesOnBoard/) |
| Obsidian + Jira Issue и Issue Manager | Карточки и синхронизация Jira в заметках | OSS, бесплатно | Локально, есть граф зависимостей | Это заметки, а не пространственная доска. Работу в Canvas подтвердить не удалось | [Jira Issue](https://community.obsidian.md/plugins/obsidian-jira-issue), [jira-graph](https://github.com/marc0l92/obsidian-jira-graph) |
| Excalidraw, AFFiNE, Penpot | OSS-доски, есть self-host | OSS | Бесплатно, self-host | Интеграции с Jira нет. В Excalidraw запрос закрыт как out of scope | [excalidraw#1189](https://github.com/excalidraw/excalidraw/issues/1189), [AFFiNE](https://affine.pro/blog/best-open-source-miro-alternatives) |

Вывод:

- Платный SaaS закрывает задачу для команд и мероприятий планирования. Дыра в другом:
  - нет бесплатного личного self-hosted инструмента;
  - для DC все требуют OAuth через админа, а PAT не поддерживает никто;
  - карточки не обновляются сами.
- Отличаемся тремя вещами: PAT без админа, автообновление с "Refresh all" и компактная карточка как в макросе Confluence.

## Спрос

| Сигнал | Сила | Источник |
|---|---|---|
| `CONFSERVER-83249` "Confluence whiteboards available for DC/on-prem": 137 голосов, 77 watchers, "Gathering Interest" с 2023-04-21, обновлен 2026-08-14 (проверено через API) | 🟢 | [CONFSERVER-83249](https://jira.atlassian.com/browse/CONFSERVER-83249) |
| За Jira на доске платят: Miro, Lucid, Mural, приложения Marketplace (191 установка у Advanced Agile Boards, только Cloud) | 🟡 | [Marketplace](https://marketplace.atlassian.com/apps/1224087/advanced-agile-boards-visual-whiteboards-for-jira) |
| Жалобы на карточки Jira в Cloud Whiteboards: нельзя менять размер, стиль, добавлять поля | 🟡 | [adjust card](https://community.atlassian.com/forums/Confluence-questions/Possibility-of-adjust-the-Jira-Card-in-the-Whiteboard/qaq-p/2868266), [style](https://community.atlassian.com/forums/Confluence-questions/Is-there-a-way-to-change-jira-card-style-in-whiteboards/qaq-p/2890327) |
| Новые продукты "задачи на холсте" для spatial thinkers и ADHD (Fabric, Forma, Canmark): это предложение, а не голос пользователей | 🟡 | [Fabric](https://fabric.so/comparison/best-adhd-task-management-app), [Forma](https://apps.apple.com/us/app/forma-tasks-notes-on-canvas/id6755406356) |
| HN "jira whiteboard": 4 поста, по 1–3 очка, 0 комментариев | 🔴 | [HN Algolia](https://hn.algolia.com/api/v1/search?query=jira%20whiteboard&tags=story&hitsPerPage=15) |
| Прямой запрос на личный self-hosted инструмент с Jira DC через PAT | 🔴 | не нашли |

Вывод: 🟡. Спрос на "доску с Jira в DC и on-prem" подтверждён, за решения в Cloud платят. Сегмент "личный инструмент лида" прямо не подтверждён: держится на гипотезе и на самом основателе.

## Голос пользователя

| Боль / желание | Частота | Цитата | Источник |
|---|---|---|---|
| Статус карточки не обновляется | 🟢 | "status never updates in Miro even though I make changes in JIRA" | [Miro Community](https://community.miro.com/ask-the-community-45/jira-cards-bi-directional-sync-updates-made-in-jira-don-t-reflect-in-miro-1076) |
| Обходной путь — пересоздавать карточку | 🟢 | "replacing the existing miro card with a new card with the latest status, but that beats the whole purpose of the integration" | [там же](https://community.miro.com/ask-the-community-45/jira-cards-bi-directional-sync-updates-made-in-jira-don-t-reflect-in-miro-1076) |
| Ручная сверка доски с Jira | 🟢 | "we have to manually compare the sprint board with the user storyboard if all stories for the last release are done" | [Miro Ideas](https://community.miro.com/ideas/important-feature-for-jira-integration-status-update-4403) |
| Инструмент без автообновления не годится | 🟡 | "Miro isn't fit for purpose if it doesn't auto update" | [Miro Community](https://community.miro.com/ask-the-community-45/jira-cards-are-not-updating-18974) |
| DC за внешним URL не подключается к SaaS | 🟡 | "we use an external URL (different from Base URL) for integration purposes due to security reasons" | [Miro Ideas](https://community.miro.com/ideas/accept-external-jira-urls-for-jira-data-center-miro-integration-9281) |
| Miro тяжелый и медленный | 🟢 | "The Miro app has gotten significantly slower and slower over the past year." | [Miro Community](https://community.miro.com/ask-the-community-45/miro-has-become-too-slow-9139) |
| "Мыслю пространственно, канбан не подходит" | 🔴 | не нашли (Reddit и HN через поиск не индексируются) | гипотеза |

## Движок холста

| Движок | Лицензия | React-карточка | Frames и группы | Стрелки с привязкой | Зрелость | Вердикт |
|---|---|---|---|---|---|---|
| tldraw 4.x и 5.x | проприетарная, ключ в проде | лучший API | да | да | 5.5.2 | ❌ не OSS ([license](https://tldraw.dev/community/license)) |
| tldraw 2.0 alpha (до `3cf4dae3`) | Apache-2.0 навсегда ([блог](https://tldraw.dev/blog/license-update-for-the-tldraw-sdk)) | да | да | да | код 2023 года, живых форков нет (лучший: [compound](https://github.com/DallasCarraher/compound), 6★, последний коммит 2024-05) | ❌ поддерживать придется самим |
| **xyflow (React Flow)** | MIT | **да, узел — это React-компонент** | **да, `parentId`, group** ([docs](https://reactflow.dev/learn/layouting/sub-flows)) | **да** | 38.6k★, `@xyflow/react` 12.12.0 от 2026-09-24 | ✅ кандидат №1 |
| Plait + Drawnix | MIT | не подтверждено | не подтверждено | не подтверждено | Drawnix 14.9k★, Plait 0.x | 🟡 нужен прототип на день |
| Excalidraw | MIT | нет: custom elements отклонены ([#8184](https://github.com/excalidraw/excalidraw/issues/8184)), остается только iframe | да | да | 133k★ | ❌ для живой карточки не подходит |
| BlockSuite (AFFiNE) | MPL-2.0 | web components, не React | да | да | последний релиз 2025-07 | ❌ |

Главный риск React Flow: это не whiteboard. Свободное рисование есть только в платном Pro-примере, его придётся собрать на `perfect-freehand`. Узлы рендерятся в DOM, на сотнях узлов может тормозить ([whiteboard docs](https://reactflow.dev/learn/advanced-use/whiteboard)).

## Инсайды

1. Все платные доски синхронизируют карточки Jira по событиям или раз в час. Пользователи годами жалуются на устаревший статус и пересоздают карточки руками. Возможность: сделать главной фичей "статус всегда свежий" — пакетный JQL-опрос `key in (...) AND updated >= -2m` раз в 30–60 с плюс "Refresh all". [Miro Community, Miro Ideas]
2. Конкуренты подключают DC через OAuth с участием админа, а DC часто стоит за внешним URL и политикой безопасности. Возможность: PAT пользователя и self-host внутри контура. Ставится без админа Jira и без выноса данных в SaaS. [Miro DC OAuth, Miro Ideas external URL, CONFSERVER-83249]
3. Ниша "доска для DC" у Atlassian стоит в статусе "Gathering Interest" уже 3,5 года (137 голосов). Конкурент из экосистемы её не закроет. [CONFSERVER-83249]
4. Нам нужна не "доска с карточками", а "карточки с доской". Поэтому основа — графовый движок с React-узлами (xyflow), а whiteboard-фичи (фигуры, рисование от руки) достраиваются поверх. Не наоборот. [Stream D]

## Гипотезы (ICE)

| # | Гипотеза | I | C | E | ICE | Как проверить в MVP |
|---|---|---|---|---|---|---|
| 1 | Лид с пространственным мышлением будет вести свои задачи Jira DC на холсте drawhl ежедневно, потому что списки и канбан не дают ему обзора. Узнаем по частоте открытий (≥ 4 дня в неделю, 2 недели) | 9 | 4 | 7 | 252 | Self-dogfood основателя и 3–5 лидов из команды. Счётчик сессий и опрос по шкале "организованность, обзор" до и после |
| 2 | Пользователь доверяет доске, только если статус обновляется сам. Узнаем по тому, что ручной "Refresh" почти не нажимают, а расхождений с Jira ≤ 1 мин | 8 | 8 | 7 | 448 | Опрос раз в 30–60 с, метрика ручных refresh, сравнение статусов |
| 3 | Тимлиды поставят drawhl сами (`docker compose up` и PAT), без админа Jira. Узнаем по 10–20 установкам в команде и соседних отделах за месяц | 7 | 5 | 6 | 210 | Установка за ≤ 10 мин по README, счётчик активных досок |
| 4 | Сообщество OSS заметит проект (звёзды, issues) после Show HN и постов в r/jira и r/selfhosted | 5 | 3 | 6 | 90 | После v0.1.0. Это вне MVP |

## Карта MVP

- **Первым (Must):** холст на xyflow (пан, зум, frames и группы, стрелки, текст и стикер); карточка Jira DC по ключу или URL через PAT (иконка типа, ключ, title, статус, сворачивание до ключа, мини-карточка по клику); автоопрос статусов и "Refresh all"; доски сохраняются на своём бэкенде; один пользователь; `docker compose up`. Проверяет гипотезы #1 и #2.
- **Вторым (Should):** рисование от руки и простые фигуры (прямоугольник, эллипс) поверх xyflow; вставка JQL, которая раскладывает задачи пачкой.
- **Не делаем:** совместное редактирование в реальном времени, Jira Cloud, Confluence и Todoist (провайдер в коде за интерфейсом, но только Jira), двусторонняя синхронизация (менять статус с доски), вебхуки, auth и роли, мобильная версия, LLM.

## Рекомендация

**go.** Дыра конкретная и подтверждена: открытого self-hosted холста с живыми карточками Jira DC нет, а главная жалоба на лидера (статус не обновляется) решается техникой, которую мы и так планируем. Главный риск — спрос именно на личный инструмент лида не подтверждён снаружи. MVP проверяем на себе и на команде (10–20 человек) до выхода в сообщество. Движок — xyflow. Plait стоит проверять, только если свободный whiteboard окажется важнее карточек.

## Ограничения ресерча

- Reddit, HN (кроме одного запроса) и X.com через поиск не читаются. Цитат про "пространственное мышление" нет.
- Цены Lucid, Mural, FigJam и объёмы установок приложений для DC не проверены.
- Страница Miro о вебхуках для DC вернула 403. Утверждение "раз в час при OAuth 2.0" взято из пересказа треда в сообществе, напрямую не проверено.
- Свойства Plait, Excalidraw frames и binding взяты из сводок, документацию не читали.

## Из библиотеки

- Похожих проектов и оценённых инструментов холста в `library/` нет.
- [[vite-react-ts]] — база фронта шаблона, xyflow ложится сверху.
- Профиля `oss` в launchpad нет: публикация приватная, `/legal` под SaaS, деплой под Render. Это закрывается отдельной задачей перед scaffold.
