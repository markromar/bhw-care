import { Platform } from 'react-native';

import { registerPushToken, revokePushToken, type PushPlatform } from './pushTokens';
import { getSupabase } from './supabase';

/**
 * Connects push token registration to the phone and to Supabase.
 *
 * The device token source is a stub for now. A real Expo push token needs the
 * expo-notifications package, an EAS project id and, as far as I know, a development
 * build (Expo Go on Android no longer supports remote push). Until that exists this
 * finds no token and does nothing.
 */

async function getDevicePushToken(): Promise<string | null> {
  return null;
}

let registeredToken: string | null = null;

function currentPlatform(): PushPlatform | null {
  if (Platform.OS === 'ios') {
    return 'ios';
  }
  if (Platform.OS === 'android') {
    return 'android';
  }
  return null;
}

async function registerOnServer(token: string, platform: PushPlatform): Promise<boolean> {
  const { error } = await getSupabase().rpc('register_push_token', {
    p_token: token,
    p_platform: platform,
  });
  return !error;
}

async function revokeOnServer(token: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from('push_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('expo_push_token', token);
  return !error;
}

/** Tries to register this device's push token for the signed-in user. Never throws. */
export async function registerDevicePushToken(): Promise<void> {
  const platform = currentPlatform();
  if (platform === null) {
    return;
  }

  const outcome = await registerPushToken({
    getToken: getDevicePushToken,
    platform,
    register: registerOnServer,
  });

  if (outcome.status === 'registered') {
    registeredToken = outcome.token;
  }
}

/** Revokes the token this app registered, if any. Call while still signed in. Never throws. */
export async function revokeDevicePushToken(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  await revokePushToken(token, revokeOnServer);
}
