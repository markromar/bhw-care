import { getSupabase } from './supabase';

/**
 * TOTP enrollment and verification, wired to the real Supabase client.
 *
 * Scope: enroll a factor and verify a code to reach aal2 for the current session.
 * Removing a factor and recovery codes are not covered here.
 */

export type EnrollResult =
  { ok: true; factorId: string; qrCodeSvg: string; secret: string } | { ok: false; error: string };

export async function startMfaEnrollment(): Promise<EnrollResult> {
  try {
    const { data, error } = await getSupabase().auth.mfa.enroll({ factorType: 'totp' });
    if (error || !data) {
      return { ok: false, error: error?.message ?? 'enrollment_failed' };
    }
    return {
      ok: true,
      factorId: data.id,
      qrCodeSvg: data.totp.qr_code,
      secret: data.totp.secret,
    };
  } catch {
    return { ok: false, error: 'enrollment_failed' };
  }
}

export type VerifyResult = { ok: true } | { ok: false; error: string };

/** Verifies the 6-digit code from the authenticator app. On success the session reaches aal2. */
export async function verifyMfaEnrollment(factorId: string, code: string): Promise<VerifyResult> {
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

/** Removes an unverified factor (used when the user cancels enrollment mid-flow). */
export async function cancelMfaEnrollment(factorId: string): Promise<void> {
  try {
    await getSupabase().auth.mfa.unenroll({ factorId });
  } catch {
    // Best-effort cleanup; an unverified factor left behind is harmless and can be
    // re-enrolled over.
  }
}
