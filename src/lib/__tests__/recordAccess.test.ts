import { resolveRecordReference } from '../recordAccess';

describe('resolveRecordReference', () => {
  it('fails closed until server-side resolution exists', async () => {
    const result = await resolveRecordReference('Zx3kQ9vT2mLpA7wRb1YdN4');

    expect(result.status).not.toBe('allowed');
    expect(result).toEqual({ status: 'not_available' });
  });
});
