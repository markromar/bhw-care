import { canDisableMfa, DEFAULT_MFA_POLICY, evaluateMfaGate, isMfaRequired } from '../mfa';
import { ROLES } from '../roles';

describe('MFA policy', () => {
  it('requires MFA only for Super Admin by default', () => {
    expect(isMfaRequired('super_admin')).toBe(true);
    for (const role of ROLES.filter((r) => r !== 'super_admin')) {
      expect(isMfaRequired(role)).toBe(false);
    }
  });

  it('allows roles that do not require MFA regardless of enrollment or level', () => {
    for (const role of ROLES.filter((r) => r !== 'super_admin')) {
      expect(evaluateMfaGate({ role, enrolled: false, currentLevel: null })).toBe('allowed');
      expect(evaluateMfaGate({ role, enrolled: false, currentLevel: 'aal1' })).toBe('allowed');
    }
  });

  it('requires enrollment when a required role has no authenticator', () => {
    expect(evaluateMfaGate({ role: 'super_admin', enrolled: false, currentLevel: 'aal1' })).toBe(
      'enrollment_required',
    );
  });

  it('requires verification when enrolled but the session is only aal1', () => {
    expect(evaluateMfaGate({ role: 'super_admin', enrolled: true, currentLevel: 'aal1' })).toBe(
      'verification_required',
    );
  });

  it('treats an unknown assurance level as not verified', () => {
    expect(evaluateMfaGate({ role: 'super_admin', enrolled: true, currentLevel: null })).toBe(
      'verification_required',
    );
  });

  it('allows a required role once the session is aal2', () => {
    expect(evaluateMfaGate({ role: 'super_admin', enrolled: true, currentLevel: 'aal2' })).toBe(
      'allowed',
    );
  });

  it('does not let a role that requires MFA turn it off', () => {
    expect(canDisableMfa('super_admin')).toBe(false);
    expect(canDisableMfa('bhw')).toBe(true);
  });

  it('applies a custom policy that also requires MFA for Kapitan', () => {
    const policy = { ...DEFAULT_MFA_POLICY, requiredRoles: ['super_admin', 'kapitan'] as const };

    expect(isMfaRequired('kapitan', policy)).toBe(true);
    expect(
      evaluateMfaGate({ role: 'kapitan', enrolled: false, currentLevel: 'aal1', policy }),
    ).toBe('enrollment_required');
    expect(canDisableMfa('kapitan', policy)).toBe(false);
  });
});
