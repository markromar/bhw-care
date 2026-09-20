import { localStore } from '@/data/instance';
import type { RoleRow } from '@/domain/sessionContext';
import { useSessionStore } from '@/state/sessionStore';

import { applyLanguageForUser, resetLanguage } from './language';
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

export type SignInResult = { ok: true } | { ok: false; message: string };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: error.message };
  }

  const result = await syncSession(data.user.id, fetchRoleRows, useSessionStore.getState());
  if (result === 'failed') {
    return { ok: false, message: 'Signed in, but your role could not be loaded.' };
  }

  await applyLanguageForUser(data.user.id);
  return { ok: true };
}

export async function signOut(): Promise<void> {
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
