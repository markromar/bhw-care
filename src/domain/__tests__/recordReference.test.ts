import { buildRecordLink, isValidRecordReference, parseRecordLink } from '../recordReference';

const REF = 'Zx3kQ9vT2mLpA7wRb1YdN4';
const HOSTS = ['app.example.test'];

describe('isValidRecordReference', () => {
  it('accepts opaque URL-safe references of 22 to 64 characters', () => {
    expect(isValidRecordReference(REF)).toBe(true);
    expect(isValidRecordReference('8f3d7c1a9b2e4d6f8a0c2e4f6a8b0c1d')).toBe(true);
    expect(isValidRecordReference('a'.repeat(64))).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isValidRecordReference('short')).toBe(false);
    expect(isValidRecordReference('a'.repeat(65))).toBe(false);
    expect(isValidRecordReference('has.a.dot.in.it.1234567')).toBe(false);
    expect(isValidRecordReference('has/slash/in/it/12345678')).toBe(false);
    expect(isValidRecordReference('has space in it 12345678')).toBe(false);
    expect(isValidRecordReference('')).toBe(false);
    expect(isValidRecordReference(null)).toBe(false);
    expect(isValidRecordReference(42)).toBe(false);
  });
});

describe('buildRecordLink', () => {
  it('builds an https link and ignores a trailing slash on the base', () => {
    expect(buildRecordLink('https://app.example.test', REF)).toBe(
      `https://app.example.test/r/${REF}`,
    );
    expect(buildRecordLink('https://app.example.test/', REF)).toBe(
      `https://app.example.test/r/${REF}`,
    );
  });

  it('refuses an invalid reference or a non-https base', () => {
    expect(buildRecordLink('https://app.example.test', 'short')).toBeNull();
    expect(buildRecordLink('http://app.example.test', REF)).toBeNull();
    expect(buildRecordLink('app.example.test', REF)).toBeNull();
  });
});

describe('parseRecordLink', () => {
  it('reads the reference from an https link on an allowed host', () => {
    expect(parseRecordLink(`https://app.example.test/r/${REF}`, HOSTS)).toBe(REF);
    expect(parseRecordLink(`https://APP.Example.Test/r/${REF}`, HOSTS)).toBe(REF);
  });

  it('reads the reference from the app scheme', () => {
    expect(parseRecordLink(`bhwcare://r/${REF}`, HOSTS)).toBe(REF);
  });

  it('rejects links that are not exactly an accepted shape', () => {
    const rejected = [
      `https://other.example.test/r/${REF}`,
      `http://app.example.test/r/${REF}`,
      `https://app.example.test/r/${REF}?name=Juan`,
      `https://app.example.test/r/${REF}#section`,
      `https://app.example.test/r/${REF}/extra`,
      `https://app.example.test/r/${REF}/`,
      `https://app.example.test/x/${REF}`,
      `bhwcare://r/${REF}?token=abc`,
      `bhwcare://x/${REF}`,
      'https://app.example.test/r/short',
      'not a link',
      '',
    ];

    for (const link of rejected) {
      expect(parseRecordLink(link, HOSTS)).toBeNull();
    }
  });
});
