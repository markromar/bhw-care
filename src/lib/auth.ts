import { localStore } from '@/data/instance';
import type { RoleRow } from '@/domain/sessionContext';
import { useSessionStore } from '@/state/sessionStore';

import { applyLanguageForUser, resetLanguage } from './language';
import { getVerifiedTotpFactor } from './mfaChallenge';
import { registerDevicePushToken, revokeDevicePushToken } from './push';
import { syncSession } from './sessionLoader';
import { getSupabase } from './supabase';

/**
 * Sign-in, sign-out and session restore for the app.
 *
 * Role rows come from the user_roles table, where a database policy lets each
 * user read only their own rows. Nothing here decides what data a user may see;
 * the database does.
 */

async function fetchRoleRows(userId: string): Promise<RoleRow[]> {
  const { data, error } = await getSupabase()
    .from('user_roles')
    .select('role, barangay_id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

async function finishSignIn(userId: string): Promise<SignInResult> {
  const result = await syncSession(userId, fetchRoleRows, useSessionStore.getState());
  if (result === 'failed') {
    return { ok: false, message: 'Signed in, but your role could not be loaded.' };
  }
  await applyLanguageForUser(userId);
  void registerDevicePushToken();
  return { ok: true };
}

export type SignInResult =
  | { ok: true }
  | { ok: false; message: string }
  | { ok: false; mfaRequired: true; factorId: string };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: error.message };
  }

  const factor = await getVerifiedTotpFactor();
  if (factor.hasVerifiedFactor) {
    // Password step passed, but this session is still aal1. Do not load role/session
    // data yet; the sign-in screen must collect and verify the TOTP code first.
    return { ok: false, mfaRequired: true, factorId: factor.factorId };
  }

  return finishSignIn(data.user.id);
}

/** Completes sign-in after a TOTP code has been verified for this session. */
export async function completeSignInAfterMfa(): Promise<SignInResult> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    return { ok: false, message: 'Session was lost during verification.' };
  }
  return finishSignIn(data.user.id);
}

export async function signOut(): Promise<void> {
  // Revoke this device's push token while the session is still valid. Never blocks.
  await revokeDevicePushToken();

  try {
    await getSupabase().auth.signOut();
  } finally {
    // Local cleanup always runs, even if contacting the server failed.
    useSessionStore.getState().setSignedOut();
    resetLanguage();
    await localStore.wipeAll();
  }
}

/**
 * Call once at app start. Restores an existing session, and signs the UI out if
 * Supabase reports a sign-out. Returns a function that stops listening.
 */
export function startSessionListener(): () => void {
  const supabase = getSupabase();

  void supabase.auth
    .getSession()
    .then(async ({ data }) => {
      const userId = data.session?.user.id ?? null;
      const result = await syncSession(userId, fetchRoleRows, useSessionStore.getState());
      if (userId !== null && result === 'signed_in') {
        await applyLanguageForUser(userId);
      }
    })
    .catch(() => useSessionStore.getState().setSignedOut());

  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      useSessionStore.getState().setSignedOut();
      resetLanguage();
      void localStore.wipeAll();
    }
  });

  return () => data.subscription.unsubscribe();
}
