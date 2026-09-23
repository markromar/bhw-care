import { getSupabase } from './supabase';

/**
 * TOTP challenge at sign-in time, for an account that already has a verified factor.
 * Distinct from mfaEnroll.ts, which creates a new factor. This only verifies an
 * existing one to upgrade the current session to aal2.
 */

export type FactorLookup =
  { hasVerifiedFactor: true; factorId: string } | { hasVerifiedFactor: false };

export async function getVerifiedTotpFactor(): Promise<FactorLookup> {
  const { data, error } = await getSupabase().auth.mfa.listFactors();
  if (error || !data) {
    return { hasVerifiedFactor: false };
  }
  const factor = data.totp.find((f) => f.status === 'verified');
  return factor ? { hasVerifiedFactor: true, factorId: factor.id } : { hasVerifiedFactor: false };
}

export type ChallengeVerifyResult = { ok: true } | { ok: false; error: string };

/** Verifies a 6-digit code against an existing, already-enrolled factor. */
export async function verifySignInChallenge(
  factorId: string,
  code: string,
): Promise<ChallengeVerifyResult> {
  try {
    const supabase = getSupabase();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError || !challenge) {
      return { ok: false, error: challengeError?.message ?? 'challenge_failed' };
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    if (verifyError) {
      return { ok: false, error: verifyError.message };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'verification_failed' };
  }
}
