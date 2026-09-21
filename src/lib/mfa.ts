import type { AssuranceLevel } from '@/domain/mfa';

import { getSupabase } from './supabase';

/**
 * Reads the signed-in user's real authenticator state from Supabase.
 * Returns null when it cannot be checked, and never guesses.
 */

export type MfaState = {
  enrolled: boolean;
  currentLevel: AssuranceLevel | null;
};

export async function fetchMfaState(): Promise<MfaState | null> {
  try {
    const supabase = getSupabase();
    const [factors, level] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    if (factors.error || level.error) {
      return null;
    }

    const enrolled = factors.data.all.some(
      (factor) => factor.factor_type === 'totp' && factor.status === 'verified',
    );
    const current = level.data.currentLevel;

    return {
      enrolled,
      currentLevel: current === 'aal1' ? 'aal1' : current === 'aal2' ? 'aal2' : null,
    };
  } catch {
    return null;
  }
}
