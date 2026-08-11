import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  zip: {
    name: 'colorsense',
    zipSources: false,
  },
  manifest: {
    name: 'ColorSense',
    description: 'Turn color-dependent web signals into accessible semantic information.',
    permissions: ['activeTab', 'scripting', 'storage'],
    action: {
      default_title: 'ColorSense',
    },
  },
});
