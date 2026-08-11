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
    default_locale: 'en',
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    permissions: ['activeTab', 'scripting', 'storage'],
    action: {
      default_title: '__MSG_extensionActionTitle__',
    },
  },
});
