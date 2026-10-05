# 11. SEO, AI-поиск и аналитика

Цель: поисковики и AI-ассистенты (ChatGPT, Perplexity, Claude, AI Overviews) видят и цитируют страницы, а мы видим, откуда приходят люди. База заложена в скелете, проект её не ломает и дополняет контентом.

## Что уже есть в скелете

| Что | Где | Зачем |
|---|---|---|
| Пререндер | `frontend/src/entry-server.tsx`, `frontend/scripts/prerender.js` (шаг `npm run build`) | GPTBot, ClaudeBot, PerplexityBot **не выполняют JS**: SPA без пререндера для них пустая ([Vercel](https://vercel.com/blog/the-rise-of-the-ai-crawler)) |
| meta, Open Graph, JSON-LD | `frontend/index.html` | Заголовок и описание в выдаче и превью ссылок |
| `robots.txt`, `sitemap.xml`, canonical | генерирует `prerender.js` из `SITE_URL` | Индексация только в prod |
| Аналитика | Umami: `UMAMI_WEBSITE_ID` → скрипт в каждой странице | Без cookies — баннер согласия не нужен |
| Легал-страницы | `frontend/src/legal/<lang>/*.md` → `/legal/<lang>/<name>/`, `<html lang>` по языку | Пишет `/legal` |

Переменные окружения сборки (в `render.yaml` у web-сервиса):

| Переменная | stage | prod |
|---|---|---|
| `SITE_URL` | URL stage | свой домен |
| `ALLOW_INDEXING` | — (stage закрыт: `noindex`, `Disallow: /`) | `true` |
| `UMAMI_WEBSITE_ID` | опционально, отдельный сайт в Umami | ID сайта |

## Правила для кода страниц

- Всё, что должен прочитать бот, — в HTML после пререндера: заголовок, описание продукта, ключевой текст. Проверка — `make audit`, строка «text visible without JS».
- Компоненты рендерятся без браузера: `window`, `localStorage`, `Date.now()` — только в `useEffect` и обработчиках. Иначе падает сборка или React ругается на hydration mismatch.
- Один `<h1>` на страницу, осмысленный `<title>` и `meta description` под запрос пользователя, а не название проекта.
- Новая публичная страница (лендинг под сегмент, FAQ, статья) — отдельный путь в `renderPages()`, чтобы попасть в пререндер и sitemap. Внутренние экраны приложения за логином в пререндер не нужны.
- Картинки — с `width`/`height` и `alt`; шрифты уже self-hosted через `@fontsource`.

## AI-поиск (GEO)

- Отвечаем на вопрос прямо в первом абзаце страницы; дальше — структура: заголовки-вопросы, списки, таблицы. Так текст легче цитировать.
- Факты с цифрами и источниками цитируют охотнее общих слов.
- `robots.txt`: поисковых ботов (`OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `PerplexityBot`) не блокируем — иначе нас не процитируют. Обучающих (`GPTBot`, `ClaudeBot`, `Google-Extended`) — решение проекта; по умолчанию открыто.
- `llms.txt` не делаем: исследования Ahrefs и SE Ranking не нашли эффекта, Google его не поддерживает.
- Глубже — скилл `ai-seo` из [marketingskills](https://github.com/coreyhaines31/marketingskills) (появится в фазе grow).

## Аудит: `make audit`

```bash
make audit                          # stage
make audit URL=https://example.com  # любой публичный URL
```

1. **PageSpeed Insights API** — те же цифры, что на [pagespeed.web.dev](https://pagespeed.web.dev/): оценки Performance / Accessibility / Best Practices / SEO, lab-метрики и полевые данные CrUX (p75 реальных пользователей; появляются только при заметном трафике).
2. **Взгляд бота** — сырой HTML без JS: текст, title, description, lang, h1, canonical, OG, JSON-LD, robots.txt (блокирует ли поисковых AI-ботов), sitemap. Провал обязательной проверки — код выхода 1. На stage ⚠️ у noindex, robots.txt и sitemap — норма: stage закрыт от индексации намеренно.

Ключ: без него общая квота Google почти всегда отвечает 429. Получить — [Google Cloud Console](https://developers.google.com/speed/docs/insights/v5/get-started) → API key с доступом к PageSpeed Insights API, положить в `.env` проекта (он в `.gitignore`) или в профиль шелла как `PSI_API_KEY`.

Пороги (Core Web Vitals, p75, [web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds)): LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Lab-замена INP — TBT ≤ 200 ms. Оценка SEO — 100, Accessibility ≥ 90.

Локальный Lighthouse (Chrome DevTools MCP, `lighthouse_audit`) — для быстрой итерации; расхождение с PSI на 10–15 баллов нормально, в отчёт идут цифры PSI.

## Аналитика: Umami

1. **Человек:** аккаунт на [cloud.umami.is](https://cloud.umami.is) (есть бесплатный план) → *Add website* → домен → скопировать Website ID.
2. **Человек:** Render → web-сервис → Environment → `UMAMI_WEBSITE_ID`, redeploy.
3. События — атрибутом на элементе, без кода: `<Button data-umami-event="signup-click">`. Шаг core scenario = событие; так сигнал успеха из brief считается сам.
4. UTM-метки (`?utm_source=...`) и реферальные параметры Umami разбирает сам — в ссылках для каналов продвижения ставим их всегда.
5. Чтение данных агентом — [Umami API](https://umami.is/docs/api) с API-ключом (`UMAMI_API_KEY` в профиле шелла).
