// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  site: 'https://smacktur.github.io',
  base: '/drawhl',
  integrations: [
    starlight({
      title: 'drawhl',
      description: 'User guide for drawhl, an open-source infinite canvas for your tasks.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/Smacktur/drawhl' }],
      editLink: { baseUrl: 'https://github.com/Smacktur/drawhl/edit/main/docs/guide/' },
      sidebar: [
        { label: 'Getting started', items: ['index', 'quick-start'] },
        {
          label: 'Using drawhl',
          items: ['adding-tasks', 'search', 'gantt', 'focus-and-timers', 'keyboard-shortcuts'],
        },
        {
          label: 'Self-hosting',
          items: ['jira-data-center', 'configuration', 'data-and-upgrades', 'security'],
        },
      ],
    }),
  ],
})
