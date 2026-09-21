// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'supabase/.temp/*'],
  },
  {
    rules: {
      // i18next documents `i18n.use(...)` and `i18n.changeLanguage(...)` on its default
      // instance, so this caution is a false positive for how we use it.
      'import/no-named-as-default-member': 'off',
    },
  },
]);
