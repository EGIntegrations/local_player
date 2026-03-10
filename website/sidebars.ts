import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'overview',
    'getting-started',
    'architecture',
    'frontend',
    'backend',
    'data-model',
    'endpoints-interfaces',
    'operations',
    'roadmap',
    {
      type: 'category',
      label: 'Reference',
      items: ['reference/source-inventory', 'reference/function-index'],
    },
  ],
};

export default sidebars;
