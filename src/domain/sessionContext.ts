import { isRole, type Role } from './roles';

/**
 * Turns a user's role rows (from the user_roles table) into the session context
 * the app uses to choose a shell.
 *
 * This is UX logic, not authorization. The database decides what data a user can
 * read, and only server-side functions can write role rows.
 */

export type RoleRow = {
  role: string;
  barangay_id: string | null;
};

export type ResolvedContext =
  | { status: 'no_role' }
  | { status: 'invalid_scope' }
  | { status: 'needs_role_selection'; roles: Role[]; barangayId: string | null }
  | { status: 'ready'; roles: Role[]; role: Role; barangayId: string | null };

export function resolveSessionContext(rows: readonly RoleRow[]): ResolvedContext {
  const valid = rows.filter((row): row is RoleRow & { role: Role } => isRole(row.role));

  if (valid.length === 0) {
    return { status: 'no_role' };
  }

  // MVP rule: a user belongs to one active operational barangay.
  const barangayIds = Array.from(
    new Set(valid.map((row) => row.barangay_id).filter((id): id is string => id !== null)),
  );

  if (barangayIds.length > 1) {
    return { status: 'invalid_scope' };
  }

  const barangayId = barangayIds.length === 1 ? barangayIds[0] : null;
  const roles = Array.from(new Set(valid.map((row) => row.role)));

  if (roles.length === 1) {
    return { status: 'ready', roles, role: roles[0], barangayId };
  }

  return { status: 'needs_role_selection', roles, barangayId };
}
