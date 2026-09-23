import { getSupabase } from './supabase';

/**
 * Calls the invite-kapitan Edge Function using the app's current session.
 * The function itself re-checks everything (caller identity, MFA, Super Admin role,
 * barangay state); this is only the client-side call, not a security boundary.
 */

export type InviteKapitanResult =
  { ok: true; invitationId: string } | { ok: false; status: number; error: string };

export async function inviteKapitan(
  email: string,
  barangayId: string,
): Promise<InviteKapitanResult> {
  try {
    const { data, error } = await getSupabase().functions.invoke('invite-kapitan', {
      body: { email, barangayId },
    });

    if (error) {
      // FunctionsHttpError carries the response; try to read the structured error body.
      const context = (error as { context?: Response }).context;
      let body: { error?: string } = {};
      try {
        body = context ? await context.clone().json() : {};
      } catch {
        body = {};
      }
      return {
        ok: false,
        status: context?.status ?? 500,
        error: body.error ?? error.message,
      };
    }

    return { ok: true, invitationId: (data as { invitationId: string }).invitationId };
  } catch {
    return { ok: false, status: 500, error: 'network_error' };
  }
}
