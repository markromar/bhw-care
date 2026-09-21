import { en } from '../../i18n/locales/en';
import { tl } from '../../i18n/locales/tl';
import { MFA_STATUS_LABEL_KEYS, summarizeMfa } from '../mfaStatus';

function lookup(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, part) => {
    if (current !== null && typeof current === 'object') {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, source);
}

describe('summarizeMfa', () => {
  it('shows off for a role that does not require MFA and has no authenticator', () => {
    expect(summarizeMfa({ role: 'bhw', enrolled: false, currentLevel: 'aal1' })).toEqual({
      required: false,
      canDisable: true,
      statusKey: 'off',
    });
  });

  it('shows active for an optional role that has enrolled', () => {
    expect(summarizeMfa({ role: 'bhw', enrolled: true, currentLevel: 'aal1' }).statusKey).toBe(
      'active',
    );
  });

  it('shows setup required for Super Admin without an authenticator', () => {
    expect(summarizeMfa({ role: 'super_admin', enrolled: false, currentLevel: 'aal1' })).toEqual({
      required: true,
      canDisable: false,
      statusKey: 'enrollment_required',
    });
  });

  it('shows verification required for Super Admin at aal1', () => {
    expect(
      summarizeMfa({ role: 'super_admin', enrolled: true, currentLevel: 'aal1' }).statusKey,
    ).toBe('verification_required');
  });

  it('treats an unknown level as not verified', () => {
    expect(
      summarizeMfa({ role: 'super_admin', enrolled: true, currentLevel: null }).statusKey,
    ).toBe('verification_required');
  });

  it('shows active for Super Admin once the session is aal2', () => {
    expect(
      summarizeMfa({ role: 'super_admin', enrolled: true, currentLevel: 'aal2' }).statusKey,
    ).toBe('active');
  });
});

describe('MFA status labels', () => {
  it('has an English and a Tagalog label for every status', () => {
    for (const key of Object.values(MFA_STATUS_LABEL_KEYS)) {
      expect(typeof lookup(en, key)).toBe('string');
      expect(typeof lookup(tl, key)).toBe('string');
    }
  });
});
