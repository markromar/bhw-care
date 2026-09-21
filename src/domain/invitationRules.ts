import type { Role } from './roles';

/**
 * Invitation rules, mirroring what the database enforces.
 *
 * These exist for the app's own use (for example, which roles an invite screen offers).
 * The database is the authority, and tests compare this file to the migration.
 */

export const INVITABLE_ROLES = ['kapitan', 'admin', 'bhw_head', 'bhw', 'rhu_nurse'] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const INVITATION_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

/** Longest allowed invitation lifetime. The database enforces the same bound. */
export const MAX_INVITATION_DAYS = 30;

const KAPITAN_CAN_INVITE: readonly InvitableRole[] = ['admin', 'bhw_head', 'bhw', 'rhu_nurse'];

/** The roles an inviter may invite. A Super Admin invites Kapitans; a Kapitan invites staff. */
export function invitableRolesFor(inviterRole: Role): readonly InvitableRole[] {
  if (inviterRole === 'super_admin') {
    return ['kapitan'];
  }
  if (inviterRole === 'kapitan') {
    return KAPITAN_CAN_INVITE;
  }
  return [];
}

export type InviteContext = {
  /** True when the invitation is for the inviter's own barangay. */
  sameBarangay: boolean;
};

export function canInvite(inviterRole: Role, targetRole: string, context: InviteContext): boolean {
  const allowed = (invitableRolesFor(inviterRole) as readonly string[]).includes(targetRole);
  if (!allowed) {
    return false;
  }
  // A Super Admin invites a Kapitan for any barangay. A Kapitan stays inside their own.
  return inviterRole === 'super_admin' ? true : context.sameBarangay;
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Lowercases and trims an email. Returns null when it does not look like an email. */
export function normalizeInvitationEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}
