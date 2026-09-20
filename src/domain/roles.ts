/**
 * BHW Care roles.
 *
 * These must match the role list in the user_roles table check constraint
 * (supabase/migrations). A test compares the two so they cannot drift apart.
 *
 * Nothing here is a security control. Route choice is UX only; the database
 * (Row Level Security) and server-side functions decide what a user may access.
 */

export const ROLES = [
  'super_admin',
  'kapitan',
  'admin',
  'bhw_head',
  'bhw',
  'rhu_nurse',
  'pregnant_mother',
  'guardian',
] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/**
 * Shell layout: Super Admin uses a drawer/sidebar, every other role uses
 * top bar plus bottom navigation.
 */
export type ShellKind = 'drawer' | 'bottom_tabs';

export function getShellKind(role: Role): ShellKind {
  return role === 'super_admin' ? 'drawer' : 'bottom_tabs';
}

const RESIDENT_ROLES: readonly Role[] = ['pregnant_mother', 'guardian'];

export function isResidentRole(role: Role): boolean {
  return RESIDENT_ROLES.includes(role);
}
