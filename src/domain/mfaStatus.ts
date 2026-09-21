import { canDisableMfa, evaluateMfaGate, isMfaRequired, type AssuranceLevel } from './mfa';
import type { Role } from './roles';

/**
 * Turns the MFA policy and the user's real authenticator state into what the
 * Profile screen shows. Display only: nothing here enforces anything.
 */

export type MfaStatusKey = 'off' | 'active' | 'enrollment_required' | 'verification_required';

export const MFA_STATUS_LABEL_KEYS: Record<MfaStatusKey, string> = {
  off: 'security.statusOff',
  active: 'security.statusActive',
  enrollment_required: 'security.statusEnrollmentRequired',
  verification_required: 'security.statusVerificationRequired',
};

export type MfaSummary = {
  required: boolean;
  canDisable: boolean;
  statusKey: MfaStatusKey;
};

type SummaryInput = {
  role: Role;
  enrolled: boolean;
  currentLevel: AssuranceLevel | null;
};

export function summarizeMfa(input: SummaryInput): MfaSummary {
  const required = isMfaRequired(input.role);
  const gate = evaluateMfaGate(input);

  let statusKey: MfaStatusKey;
  if (!required) {
    statusKey = input.enrolled ? 'active' : 'off';
  } else if (gate === 'enrollment_required') {
    statusKey = 'enrollment_required';
  } else if (gate === 'verification_required') {
    statusKey = 'verification_required';
  } else {
    statusKey = 'active';
  }

  return { required, canDisable: canDisableMfa(input.role), statusKey };
}
