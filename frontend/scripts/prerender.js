// Post-build step: static HTML for every page, robots.txt and sitemap.xml in dist/.
// Env (set per environment in render.yaml):
//   SITE_URL          public origin, e.g. https://example.com — canonical links and sitemap
//   ALLOW_INDEXING    "true" only in production; anything else serves noindex + Disallow
//   UMAMI_WEBSITE_ID  enables Umami analytics; UMAMI_SCRIPT_URL overrides the cloud script
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const dist = new URL('../dist/', import.meta.url)
const server = new URL('.server/', dist)
const { renderPages } = await import(new URL('entry-server.js', server).href)

const site = (process.env.SITE_URL ?? '').replace(/\/$/, '')
const indexing = process.env.ALLOW_INDEXING === 'true' && site !== ''
const umamiId = process.env.UMAMI_WEBSITE_ID
const umamiUrl = process.env.UMAMI_SCRIPT_URL ?? 'https://cloud.umami.is/script.js'

const template = readFileSync(new URL('index.html', dist), 'utf8')
const siteTitle = template.match(/<title>(.*)<\/title>/)[1]
const pages = renderPages()

for (const page of pages) {
  const head = [
    site && `<link rel="canonical" href="${site}${page.path}" />`,
    !indexing && '<meta name="robots" content="noindex" />',
    umamiId && `<script defer src="${umamiUrl}" data-website-id="${umamiId}"></script>`,
  ].filter(Boolean)
  let html = template
    .replace('<!--head-->', head.join('\n    '))
    .replace('<!--app-->', () => page.body)
  if (page.lang) html = html.replace(/<html lang="[^"]*"/, `<html lang="${page.lang}"`)
  if (page.title) {
    html = html.replace(/<title>.*<\/title>/, `<title>${page.title} — ${siteTitle}</title>`)
  }
  if (!page.hydrate) {
    html = html.replace(
      /\s*<(script type="module"|link rel="modulepreload")[^>]*>(<\/script>)?/g,
      '',
    )
  }
  const dir = new URL(`.${page.path}`, dist)
  mkdirSync(dir, { recursive: true })
  writeFileSync(new URL('index.html', dir), html)
}

const robots = indexing
  ? `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`
  : 'User-agent: *\nDisallow: /\n'
writeFileSync(new URL('robots.txt', dist), robots)
if (indexing) {
  const urls = pages.map((page) => `  <url><loc>${site}${page.path}</loc></url>`).join('\n')
  writeFileSync(
    new URL('sitemap.xml', dist),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  )
}
rmSync(server, { recursive: true })
console.log(`prerendered ${pages.length} page(s), indexing ${indexing ? 'on' : 'off'}`)
