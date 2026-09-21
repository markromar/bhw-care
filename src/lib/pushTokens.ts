/**
 * Push token registration logic.
 *
 * Pure and dependency-injected so it can be unit tested. It never throws: every
 * problem becomes a status. Registering a token never blocks sign-in or sign-out.
 */

export type PushPlatform = 'ios' | 'android';

const TOKEN_PATTERN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$/;

export function isValidExpoPushToken(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 300 && TOKEN_PATTERN.test(value);
}

export type PushDeps = {
  getToken: () => Promise<string | null>;
  platform: PushPlatform;
  register: (token: string, platform: PushPlatform) => Promise<boolean>;
};

export type RegisterOutcome =
  { status: 'registered'; token: string } | { status: 'no_token' | 'invalid_token' | 'failed' };

export async function registerPushToken(deps: PushDeps): Promise<RegisterOutcome> {
  let token: string | null;
  try {
    token = await deps.getToken();
  } catch {
    return { status: 'no_token' };
  }

  if (token === null) {
    return { status: 'no_token' };
  }
  if (!isValidExpoPushToken(token)) {
    return { status: 'invalid_token' };
  }

  try {
    const registered = await deps.register(token, deps.platform);
    return registered ? { status: 'registered', token } : { status: 'failed' };
  } catch {
    return { status: 'failed' };
  }
}

/** Revokes a previously registered token. Returns true only if the revoke succeeded. */
export async function revokePushToken(
  token: string | null,
  revoke: (token: string) => Promise<boolean>,
): Promise<boolean> {
  if (token === null) {
    return false;
  }
  try {
    return await revoke(token);
  } catch {
    return false;
  }
}
