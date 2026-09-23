/**
 * Pure request-handling logic for the invite-kapitan function.
 *
 * No Deno-specific APIs, so it is unit tested with Jest. The Edge Function
 * (index.ts) wires this to the real Supabase clients and the HTTP request.
 */

import { normalizeInvitationEmail } from '../../../src/domain/invitationRules.ts';

export type CallerInfo = {
  userId: string;
  assuranceLevel: 'aal1' | 'aal2' | null;
};

export type RoleLookup = (userId: string) => Promise<{ isSuperAdmin: boolean }>;
export type BarangayLookup = (
  barangayId: string,
) => Promise<{ exists: boolean; status: string } | null>;
export type CreateInvitation = (input: {
  email: string;
  barangayId: string;
  invitedBy: string;
}) => Promise<{ id: string }>;
export type SendInviteEmail = (input: {
  email: string;
  invitationId: string;
}) => Promise<{ invitedUserId: string }>;
export type SetTokenReference = (invitationId: string, invitedUserId: string) => Promise<void>;
export type WriteAudit = (input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  barangayId: string;
  details: Record<string, unknown>;
}) => Promise<void>;

export type InviteKapitanRequest = {
  email: unknown;
  barangayId: unknown;
};

export type InviteKapitanResult =
  | { ok: true; status: 200; body: { invitationId: string } }
  | { ok: false; status: 400 | 401 | 403 | 404 | 500; body: { error: string } };

export type InviteKapitanDeps = {
  getRole: RoleLookup;
  getBarangay: BarangayLookup;
  createInvitation: CreateInvitation;
  sendInviteEmail: SendInviteEmail;
  setTokenReference: SetTokenReference;
  writeAudit: WriteAudit;
};

/**
 * Handles one invite-kapitan request. Every failure path returns a result rather
 * than throwing, so the Edge Function can always produce a clean HTTP response.
 *
 * The invitation row is the authorization source; the email is only delivery.
 * A failure to send the email does not roll back the invitation row (it stays valid
 * and can be resent later), but is reported so the caller knows delivery may have failed.
 */
export async function handleInviteKapitan(
  caller: CallerInfo | null,
  request: InviteKapitanRequest,
  deps: InviteKapitanDeps,
): Promise<InviteKapitanResult> {
  if (caller === null) {
    return { ok: false, status: 401, body: { error: 'not_authenticated' } };
  }

  if (caller.assuranceLevel !== 'aal2') {
    return { ok: false, status: 403, body: { error: 'mfa_verification_required' } };
  }

  const role = await deps.getRole(caller.userId);
  if (!role.isSuperAdmin) {
    return { ok: false, status: 403, body: { error: 'not_super_admin' } };
  }

  if (typeof request.email !== 'string') {
    return { ok: false, status: 400, body: { error: 'invalid_email' } };
  }
  const email = normalizeInvitationEmail(request.email);
  if (email === null) {
    return { ok: false, status: 400, body: { error: 'invalid_email' } };
  }

  if (typeof request.barangayId !== 'string' || request.barangayId.trim() === '') {
    return { ok: false, status: 400, body: { error: 'invalid_barangay' } };
  }
  const barangay = await deps.getBarangay(request.barangayId);
  if (barangay === null || !barangay.exists) {
    return { ok: false, status: 404, body: { error: 'barangay_not_found' } };
  }
  if (barangay.status === 'suspended') {
    return { ok: false, status: 400, body: { error: 'barangay_suspended' } };
  }

  let created: { id: string };
  try {
    created = await deps.createInvitation({
      email,
      barangayId: request.barangayId,
      invitedBy: caller.userId,
    });
  } catch {
    return { ok: false, status: 500, body: { error: 'invitation_creation_failed' } };
  }

  try {
    const sent = await deps.sendInviteEmail({ email, invitationId: created.id });
    await deps.setTokenReference(created.id, sent.invitedUserId);
  } catch {
    // The invitation row exists and is valid regardless of email delivery. The row is
    // the authorization source; the email is only delivery and can be retried by
    // re-sending later. Not treated as a hard failure of the request.
  }

  try {
    await deps.writeAudit({
      actorId: caller.userId,
      action: 'invitation.created',
      entityType: 'role_invitation',
      entityId: created.id,
      barangayId: request.barangayId,
      details: { role: 'kapitan' },
    });
  } catch {
    // The invitation was created; audit failure is logged server-side but does not
    // undo a successful, database-validated invitation.
  }

  return { ok: true, status: 200, body: { invitationId: created.id } };
}
