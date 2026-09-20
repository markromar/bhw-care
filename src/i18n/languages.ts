/**
 * Supported UI languages and the language resolution rule.
 *
 * Resolution order (BHW Care Master Skill):
 *   user preference -> system default -> English
 */

export const SUPPORTED_LANGUAGES = ['en', 'tl'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const FALLBACK_LANGUAGE: Language = 'en';

export function isSupportedLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Pure function: decides which language the UI should use.
 * Both inputs may be null/undefined/invalid; the result is always a supported language.
 */
export function resolveLanguage(
  userPreference: string | null | undefined,
  systemDefault: string | null | undefined,
): Language {
  if (isSupportedLanguage(userPreference)) {
    return userPreference;
  }
  if (isSupportedLanguage(systemDefault)) {
    return systemDefault;
  }
  return FALLBACK_LANGUAGE;
}
