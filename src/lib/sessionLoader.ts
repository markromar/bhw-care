import { resolveSessionContext, type ResolvedContext, type RoleRow } from '@/domain/sessionContext';

/**
 * Loads a user's role rows and puts the resolved context into the session store.
 *
 * Fails closed: if the role lookup fails, the user is treated as signed out rather
 * than signed in with a guessed role. This file has no native imports so it can be
 * unit tested.
 */

export type SessionSink = {
  setSignedOut: () => void;
  setSignedIn: (userId: string, context: ResolvedContext) => void;
};

export type SyncResult = 'signed_out' | 'signed_in' | 'failed';

export async function syncSession(
  userId: string | null,
  fetchRoleRows: (userId: string) => Promise<RoleRow[]>,
  sink: SessionSink,
): Promise<SyncResult> {
  if (userId === null) {
    sink.setSignedOut();
    return 'signed_out';
  }

  try {
    const rows = await fetchRoleRows(userId);
    sink.setSignedIn(userId, resolveSessionContext(rows));
    return 'signed_in';
  } catch {
    sink.setSignedOut();
    return 'failed';
  }
}
