import { resolveLanguage } from '../languages';
import { en } from '../locales/en';
import { tl } from '../locales/tl';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flattenKeys(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('resolveLanguage', () => {
  it('uses the user preference when it is supported', () => {
    expect(resolveLanguage('tl', 'en')).toBe('tl');
  });

  it('falls back to the system default when the user has no preference', () => {
    expect(resolveLanguage(null, 'tl')).toBe('tl');
  });

  it('falls back to English when neither value is usable', () => {
    expect(resolveLanguage(undefined, null)).toBe('en');
  });

  it('ignores unsupported language codes', () => {
    expect(resolveLanguage('fr', 'de')).toBe('en');
    expect(resolveLanguage('fr', 'tl')).toBe('tl');
  });
});

describe('translation files', () => {
  it('English and Tagalog define exactly the same keys', () => {
    expect(flattenKeys(tl).sort()).toEqual(flattenKeys(en).sort());
  });
});
