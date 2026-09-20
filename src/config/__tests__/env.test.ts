import { parseEnv } from '../env';

describe('parseEnv', () => {
  it('accepts a valid URL and a non-empty publishable key', () => {
    const raw = {
      supabaseUrl: 'https://abcdefgh.supabase.co',
      supabasePublishableKey: 'sb_publishable_test-key',
    };

    expect(parseEnv(raw)).toEqual(raw);
  });

  it('rejects a malformed URL', () => {
    expect(() =>
      parseEnv({
        supabaseUrl: 'not-a-url',
        supabasePublishableKey: 'sb_publishable_test-key',
      }),
    ).toThrow(/invalid/);
  });

  it('rejects an empty publishable key', () => {
    expect(() =>
      parseEnv({
        supabaseUrl: 'https://abcdefgh.supabase.co',
        supabasePublishableKey: '',
      }),
    ).toThrow(/invalid/);
  });

  it('rejects missing values', () => {
    expect(() => parseEnv({ supabaseUrl: undefined, supabasePublishableKey: undefined })).toThrow(
      /invalid/,
    );
  });

  it('rejects the placeholder values copied from .env.example', () => {
    expect(() =>
      parseEnv({
        supabaseUrl: 'https://your-project-ref.supabase.co',
        supabasePublishableKey: 'your-supabase-publishable-key',
      }),
    ).toThrow(/placeholder/);
  });

  it('rejects a Supabase secret key so it can never ship in the app', () => {
    expect(() =>
      parseEnv({
        supabaseUrl: 'https://abcdefgh.supabase.co',
        supabasePublishableKey: 'sb_secret_test-key',
      }),
    ).toThrow(/SECRET key/);
  });
});
