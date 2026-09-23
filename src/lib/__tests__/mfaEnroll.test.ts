/**
 * These wrap the live Supabase client directly, so behavior is proven by the manual
 * live test in this step's instructions rather than by mocked unit tests. This file
 * only checks the module's shape stays stable.
 */
import * as mfaEnroll from '../mfaEnroll';

describe('mfaEnroll module shape', () => {
  it('exports the three functions the Profile screen depends on', () => {
    expect(typeof mfaEnroll.startMfaEnrollment).toBe('function');
    expect(typeof mfaEnroll.verifyMfaEnrollment).toBe('function');
    expect(typeof mfaEnroll.cancelMfaEnrollment).toBe('function');
  });
});
