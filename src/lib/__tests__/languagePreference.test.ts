import { loadEffectiveLanguage } from '../languagePreference';

describe('loadEffectiveLanguage', () => {
  it('uses the user preference when there is one', async () => {
    const fetchUserPreference = jest.fn().mockResolvedValue('tl');
    const fetchSystemDefault = jest.fn().mockResolvedValue('en');

    const language = await loadEffectiveLanguage('user-1', {
      fetchUserPreference,
      fetchSystemDefault,
    });

    expect(language).toBe('tl');
    expect(fetchUserPreference).toHaveBeenCalledWith('user-1');
  });

  it('falls back to the system default when the user has no preference', async () => {
    const language = await loadEffectiveLanguage('user-1', {
      fetchUserPreference: jest.fn().mockResolvedValue(null),
      fetchSystemDefault: jest.fn().mockResolvedValue('tl'),
    });

    expect(language).toBe('tl');
  });

  it('falls back to the system default when the user lookup fails', async () => {
    const language = await loadEffectiveLanguage('user-1', {
      fetchUserPreference: jest.fn().mockRejectedValue(new Error('network down')),
      fetchSystemDefault: jest.fn().mockResolvedValue('tl'),
    });

    expect(language).toBe('tl');
  });

  it('falls back to English when both lookups fail', async () => {
    const language = await loadEffectiveLanguage('user-1', {
      fetchUserPreference: jest.fn().mockRejectedValue(new Error('network down')),
      fetchSystemDefault: jest.fn().mockRejectedValue(new Error('network down')),
    });

    expect(language).toBe('en');
  });

  it('does not look up a user preference when nobody is signed in', async () => {
    const fetchUserPreference = jest.fn();

    const language = await loadEffectiveLanguage(null, {
      fetchUserPreference,
      fetchSystemDefault: jest.fn().mockResolvedValue('tl'),
    });

    expect(language).toBe('tl');
    expect(fetchUserPreference).not.toHaveBeenCalled();
  });

  it('ignores unsupported language codes', async () => {
    const language = await loadEffectiveLanguage('user-1', {
      fetchUserPreference: jest.fn().mockResolvedValue('fr'),
      fetchSystemDefault: jest.fn().mockResolvedValue('de'),
    });

    expect(language).toBe('en');
  });
});
