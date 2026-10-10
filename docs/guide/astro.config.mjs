// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  site: 'https://docs.tiko.run',
  integrations: [
    starlight({
      title: 'tiko',
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        replacesTitle: true,
      },
      description: 'User guide for tiko, an open-source infinite canvas for your tasks.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/tiko-run/tiko' }],
      editLink: { baseUrl: 'https://github.com/tiko-run/tiko/edit/main/docs/guide/' },
      sidebar: [
        { label: 'Getting started', items: ['index', 'install', 'quick-start'] },
        {
          label: 'Using tiko',
          items: [
            'adding-tasks',
            'working-together',
            'search',
            'gantt',
            'focus-and-timers',
            'keyboard-shortcuts',
          ],
        },
        {
          label: 'Self-hosting',
          items: ['jira-data-center', 'configuration', 'data-and-upgrades', 'security'],
        },
      ],
    }),
  ],
})
