/**
 * Wraps the live Supabase client directly (challenge/verify against a real project),
 * so behavior is proven by the manual live test in the sign-in flow rather than mocks.
 * This file only checks the module's shape stays stable.
 */
import * as mfaChallenge from '../mfaChallenge';

describe('mfaChallenge module shape', () => {
  it('exports the two functions the sign-in screen depends on', () => {
    expect(typeof mfaChallenge.getVerifiedTotpFactor).toBe('function');
    expect(typeof mfaChallenge.verifySignInChallenge).toBe('function');
  });
});
