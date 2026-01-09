 import { defineConfig } from 'vitepress';

export default defineConfig({
  title: '@noneforge/ioc',
  description: 'Type-safe dependency injection container for TypeScript',
  base: '/ioc/',

  head: [
    ['meta', { name: 'theme-color', content: '#3178c6' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: '@noneforge/ioc' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'Type-safe DI container for TypeScript',
      },
    ],
  ],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/guide/api-reference' },
      { text: 'Examples', link: '/examples/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Core Concepts', link: '/guide/core-concepts' },
          ],
        },
        {
          text: 'Essentials',
          items: [
            { text: 'Providers', link: '/guide/providers' },
            { text: 'Decorators', link: '/guide/decorators' },
            { text: 'Injection Functions', link: '/guide/injection' },
            { text: 'Scopes', link: '/guide/scopes' },
            { text: 'Modules', link: '/guide/modules' },
            { text: 'Bootstrap', link: '/guide/bootstrap' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Interceptors', link: '/guide/interceptors' },
            { text: 'Middleware', link: '/guide/middleware' },
            { text: 'Lifecycle Hooks', link: '/guide/lifecycle-hooks' },
            { text: 'Caching', link: '/guide/caching' },
            { text: 'Plugins', link: '/guide/plugins' },
            { text: 'Provider Helpers', link: '/guide/provider-helpers' },
            { text: 'Dependency Graph', link: '/guide/dependency-graph' },
            { text: 'Testing', link: '/guide/testing' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'API Reference', link: '/guide/api-reference' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/noneforge/ioc' },
    ],

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/noneforge/ioc/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2026 noneforge',
    },
  },

  markdown: {
    lineNumbers: true,
  },
});
