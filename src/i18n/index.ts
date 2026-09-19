import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { FALLBACK_LANGUAGE, type Language } from "./languages";
import { en } from "./locales/en";
import { tl } from "./locales/tl";

export {
    resolveLanguage,
    SUPPORTED_LANGUAGES,
    type Language
} from "./languages";

/**
 * Initializes i18next once. Call setupI18n() at app start with the language
 * resolved from: user preference -> system default -> English.
 */
export function setupI18n(language: Language = FALLBACK_LANGUAGE) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        tl: { translation: tl },
      },
      lng: language,
      fallbackLng: FALLBACK_LANGUAGE,
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  } else {
    void i18n.changeLanguage(language);
  }
  return i18n;
}

export default i18n;
