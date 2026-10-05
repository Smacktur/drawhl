// Build-time renderer used by scripts/prerender.js: crawlers and AI bots read HTML without running JS.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { marked } from 'marked'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.tsx'

export type Page = {
  path: string
  body: string
  title?: string
  // false = static page, served without the app bundle.
  hydrate: boolean
  lang?: string
}

// Legal documents written by /legal: src/legal/<lang>/<name>.md → /legal/<lang>/<name>/.
const legalDocs = import.meta.glob<string>('./legal/*/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export function renderPages(): Page[] {
  const client = new QueryClient()
  const home: Page = {
    path: '/',
    body: renderToString(
      <StrictMode>
        <QueryClientProvider client={client}>
          <App />
        </QueryClientProvider>
      </StrictMode>,
    ),
    hydrate: true,
  }
  const legal = Object.entries(legalDocs).map(([file, markdown]) => ({
    path: `/legal/${file.slice('./legal/'.length, -'.md'.length)}/`,
    lang: file.split('/')[2],
    body: `<article class="legal"><p><a href="/">drawhl</a></p>${marked.parse(markdown, { async: false })}</article>`,
    title: markdown.match(/^# (.+)$/m)?.[1],
    hydrate: false,
  }))
  return [home, ...legal]
}
