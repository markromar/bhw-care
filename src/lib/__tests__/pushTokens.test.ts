import { isValidExpoPushToken, registerPushToken, revokePushToken } from '../pushTokens';

const TOKEN = 'ExponentPushToken[synthetic-test-token-0001]';

describe('isValidExpoPushToken', () => {
  it('accepts the Expo push token formats', () => {
    expect(isValidExpoPushToken(TOKEN)).toBe(true);
    expect(isValidExpoPushToken('ExpoPushToken[abcdefghijklmnopqrstuv]')).toBe(true);
  });

  it('rejects anything else', () => {
    const rejected = [
      '',
      'abc',
      'ExponentPushToken[short]',
      'ExponentPushToken[has space in it 1234]',
      `ExponentPushToken[${'a'.repeat(301)}]`,
      'FCM:abcdefghijklmnop',
    ];

    for (const value of rejected) {
      expect(isValidExpoPushToken(value)).toBe(false);
    }
    expect(isValidExpoPushToken(null)).toBe(false);
    expect(isValidExpoPushToken(42)).toBe(false);
  });
});

describe('registerPushToken', () => {
  it('registers a valid token for the platform', async () => {
    const register = jest.fn().mockResolvedValue(true);

    const outcome = await registerPushToken({
      getToken: async () => TOKEN,
      platform: 'android',
      register,
    });

    expect(outcome).toEqual({ status: 'registered', token: TOKEN });
    expect(register).toHaveBeenCalledWith(TOKEN, 'android');
  });

  it('reports no token when the device has none or cannot provide one', async () => {
    const register = jest.fn();

    const none = await registerPushToken({
      getToken: async () => null,
      platform: 'ios',
      register,
    });
    const failing = await registerPushToken({
      getToken: async () => {
        throw new Error('not supported');
      },
      platform: 'ios',
      register,
    });

    expect(none).toEqual({ status: 'no_token' });
    expect(failing).toEqual({ status: 'no_token' });
    expect(register).not.toHaveBeenCalled();
  });

  it('does not send a malformed token to the server', async () => {
    const register = jest.fn();

    const outcome = await registerPushToken({
      getToken: async () => 'not-a-token',
      platform: 'android',
      register,
    });

    expect(outcome).toEqual({ status: 'invalid_token' });
    expect(register).not.toHaveBeenCalled();
  });

  it('reports failure when the server call fails or throws', async () => {
    const rejected = await registerPushToken({
      getToken: async () => TOKEN,
      platform: 'android',
      register: jest.fn().mockResolvedValue(false),
    });
    const thrown = await registerPushToken({
      getToken: async () => TOKEN,
      platform: 'android',
      register: jest.fn().mockRejectedValue(new Error('network down')),
    });

    expect(rejected).toEqual({ status: 'failed' });
    expect(thrown).toEqual({ status: 'failed' });
  });
});

describe('revokePushToken', () => {
  it('revokes a known token', async () => {
    const revoke = jest.fn().mockResolvedValue(true);

    expect(await revokePushToken(TOKEN, revoke)).toBe(true);
    expect(revoke).toHaveBeenCalledWith(TOKEN);
  });

  it('does nothing without a token, and never throws', async () => {
    const revoke = jest.fn().mockRejectedValue(new Error('network down'));

    expect(await revokePushToken(null, revoke)).toBe(false);
    expect(revoke).not.toHaveBeenCalled();
    expect(await revokePushToken(TOKEN, revoke)).toBe(false);
  });
});
