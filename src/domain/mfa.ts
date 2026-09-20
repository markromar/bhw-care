import type { Role } from './roles';

/**
 * Multi-factor authentication (MFA) policy model.
 *
 * Supabase reports an authenticator assurance level (AAL) for each session:
 * 'aal1' after a password-only sign-in, 'aal2' after a second factor.
 *
 * This file only decides what the policy requires. It does not talk to Supabase
 * and blocks nothing by itself. Real enforcement, including database-level checks,
 * is added on Day 2. Nothing here is a security control on its own.
 */

export type AssuranceLevel = 'aal1' | 'aal2';

export type MfaPolicy = {
  requiredRoles: readonly Role[];
};

// Super Admin must use MFA by default. The policy can be extended later.
export const DEFAULT_MFA_POLICY: MfaPolicy = {
  requiredRoles: ['super_admin'],
};

export type MfaGate = 'allowed' | 'enrollment_required' | 'verification_required';

export function isMfaRequired(role: Role, policy: MfaPolicy = DEFAULT_MFA_POLICY): boolean {
  return policy.requiredRoles.includes(role);
}

type GateInput = {
  role: Role;
  enrolled: boolean;
  currentLevel: AssuranceLevel | null;
  policy?: MfaPolicy;
};

/**
 * Decides whether a session may perform privileged actions.
 * An unknown assurance level is treated as not verified (fail closed).
 */
export function evaluateMfaGate({
  role,
  enrolled,
  currentLevel,
  policy = DEFAULT_MFA_POLICY,
}: GateInput): MfaGate {
  if (!isMfaRequired(role, policy)) {
    return 'allowed';
  }
  if (!enrolled) {
    return 'enrollment_required';
  }
  if (currentLevel !== 'aal2') {
    return 'verification_required';
  }
  return 'allowed';
}

/**
 * The profile toggle is not a bypass: a role that requires MFA cannot turn it off.
 */
export function canDisableMfa(role: Role, policy: MfaPolicy = DEFAULT_MFA_POLICY): boolean {
  return !isMfaRequired(role, policy);
}
