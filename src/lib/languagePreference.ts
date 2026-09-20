import { resolveLanguage, type Language } from '@/i18n/languages';

/**
 * Works out which language the UI should use for a signed-in user:
 *   user preference -> system default -> English.
 *
 * Failed lookups never block the app; they simply fall through to the next
 * source. This file has no native imports so it can be unit tested.
 */

export type LanguageSources = {
  fetchUserPreference: (userId: string) => Promise<string | null>;
  fetchSystemDefault: () => Promise<string | null>;
};

export async function loadEffectiveLanguage(
  userId: string | null,
  sources: LanguageSources,
): Promise<Language> {
  let userPreference: string | null = null;
  let systemDefault: string | null = null;

  if (userId !== null) {
    try {
      userPreference = await sources.fetchUserPreference(userId);
    } catch {
      userPreference = null;
    }
  }

  try {
    systemDefault = await sources.fetchSystemDefault();
  } catch {
    systemDefault = null;
  }

  return resolveLanguage(userPreference, systemDefault);
}
