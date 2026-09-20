import { resolveLanguage, setupI18n, type Language } from '@/i18n';

import { loadEffectiveLanguage } from './languagePreference';
import { getSupabase } from './supabase';

/**
 * Connects the language rule to Supabase and to the running UI.
 *
 * Reads and writes only the signed-in user's own profile row. A database policy
 * enforces that; nothing here decides what a user may access.
 */

async function fetchUserPreference(userId: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('user_profiles')
    .select('preferred_language')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data?.preferred_language ?? null;
}

async function fetchSystemDefault(): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('system_settings')
    .select('value')
    .eq('key', 'system_default_language')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return typeof data?.value === 'string' ? data.value : null;
}

/** Applies the effective language for a signed-in user. Never throws. */
export async function applyLanguageForUser(userId: string): Promise<void> {
  const language = await loadEffectiveLanguage(userId, {
    fetchUserPreference,
    fetchSystemDefault,
  });
  setupI18n(language);
}

/** Back to the default language, used after sign-out. */
export function resetLanguage(): void {
  setupI18n(resolveLanguage(null, 'en'));
}

/**
 * Switches the UI language right away, then tries to save it to the user's profile.
 * Returns true only if the save reached the database.
 */
export async function setLanguagePreference(userId: string, language: Language): Promise<boolean> {
  setupI18n(language);

  try {
    const { data, error } = await getSupabase()
      .from('user_profiles')
      .update({ preferred_language: language })
      .eq('id', userId)
      .select('id');

    return !error && data !== null && data.length > 0;
  } catch {
    return false;
  }
}
