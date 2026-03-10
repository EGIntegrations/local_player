import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Local Player Documentation',
  tagline: 'Exhaustive technical documentation for the Local Player desktop application',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://local-player-docs.vercel.app',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/EGIntegrations/local_player/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Local Player',
      logo: {
        alt: 'Local Player Icon',
        src: 'img/local-player-icon.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/EGIntegrations/local_player',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Overview', to: '/docs/overview'},
            {label: 'Operations', to: '/docs/operations'},
          ],
        },
        {
          title: 'Repository',
          items: [
            {
              label: 'Source Code',
              href: 'https://github.com/EGIntegrations/local_player',
            },
            {
              label: 'Release Workflow',
              href: 'https://github.com/EGIntegrations/local_player/blob/main/.github/workflows/release.yml',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} EGIntegrations. Local Player documentation.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
