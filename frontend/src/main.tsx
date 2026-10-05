import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

// Theme follows the OS; shadcn tokens switch on the .dark class.
const darkScheme = window.matchMedia('(prefers-color-scheme: dark)')
const applyScheme = () => document.documentElement.classList.toggle('dark', darkScheme.matches)
applyScheme()
darkScheme.addEventListener('change', applyScheme)

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)

// Production HTML is prerendered (scripts/prerender.js); the dev server serves an empty root.
if (root.firstElementChild) hydrateRoot(root, app)
else createRoot(root).render(app)
