/**
 * Pure request-handling logic for the accept-invitation function.
 *
 * No Deno-specific APIs, so it is unit tested with Jest. The Edge Function
 * (index.ts) wires this to the real Supabase clients and the HTTP request.
 *
 * The invitation row is the single source of truth for role and barangay: neither is
 * ever taken from client input. token_reference (set when the invite email was sent)
 * is what proves the specific invited user maps to the specific invitation.
 */

export type CallerInfo = { userId: string };

export type FindPendingInvitation = (userId: string) => Promise<{
  id: string;
  role: string;
  barangayId: string;
  expiresAt: string;
} | null>;
export type CreateProfile = (userId: string) => Promise<void>;
export type AssignRole = (input: {
  userId: string;
  role: string;
  barangayId: string;
}) => Promise<void>;
export type MarkAccepted = (invitationId: string, userId: string) => Promise<boolean>;
export type WriteAudit = (input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  barangayId: string;
  details: Record<string, unknown>;
}) => Promise<void>;

export type AcceptInvitationResult =
  | { ok: true; status: 200; body: { role: string; barangayId: string } }
  | { ok: false; status: 401 | 404 | 409 | 500; body: { error: string } };

export type AcceptInvitationDeps = {
  findPendingInvitation: FindPendingInvitation;
  createProfile: CreateProfile;
  assignRole: AssignRole;
  markAccepted: MarkAccepted;
  writeAudit: WriteAudit;
};

/**
 * Finishes an invitation for a caller who is already authenticated via the invite
 * link (Supabase's inviteUserByEmail flow signs the person in as part of the link).
 */
export async function handleAcceptInvitation(
  caller: CallerInfo | null,
  deps: AcceptInvitationDeps,
): Promise<AcceptInvitationResult> {
  if (caller === null) {
    return { ok: false, status: 401, body: { error: 'not_authenticated' } };
  }

  const invitation = await deps.findPendingInvitation(caller.userId);
  if (invitation === null) {
    return { ok: false, status: 404, body: { error: 'no_pending_invitation' } };
  }

  if (Date.parse(invitation.expiresAt) <= Date.now()) {
    return { ok: false, status: 409, body: { error: 'invitation_expired' } };
  }

  try {
    await deps.createProfile(caller.userId);
  } catch {
    return { ok: false, status: 500, body: { error: 'profile_creation_failed' } };
  }

  try {
    await deps.assignRole({
      userId: caller.userId,
      role: invitation.role,
      barangayId: invitation.barangayId,
    });
  } catch {
    return { ok: false, status: 500, body: { error: 'role_assignment_failed' } };
  }

  const marked = await deps.markAccepted(invitation.id, caller.userId);
  if (!marked) {
    // The invitation could not be transitioned to accepted (for example it expired or
    // was revoked in the moment between the check above and this write). The role and
    // profile writes already happened; this is reported so the caller can investigate,
    // rather than silently claiming success on an invitation that did not close out.
    return { ok: false, status: 409, body: { error: 'invitation_could_not_be_closed' } };
  }

  try {
    await deps.writeAudit({
      actorId: caller.userId,
      action: 'invitation.accepted',
      entityType: 'role_invitation',
      entityId: invitation.id,
      barangayId: invitation.barangayId,
      details: { role: invitation.role },
    });
  } catch {
    // Acceptance already succeeded; audit failure does not undo it.
  }

  return {
    ok: true,
    status: 200,
    body: { role: invitation.role, barangayId: invitation.barangayId },
  };
}
