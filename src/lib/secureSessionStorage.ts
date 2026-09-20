import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
    createChunkedStorage,
    type AsyncKeyValueBackend,
} from "./chunkedStorage";

/**
 * Storage used by the Supabase client for the login session.
 *
 * - iOS/Android: platform secure storage (Keychain / Keystore), chunked.
 * - Web (only used for developer testing in a browser): in memory, so nothing
 *   is written to browser storage. The session is lost on page reload.
 */

const secureStoreBackend: AsyncKeyValueBackend = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

function createMemoryBackend(): AsyncKeyValueBackend {
  const memory = new Map<string, string>();
  return {
    getItem: async (key) => memory.get(key) ?? null,
    setItem: async (key, value) => {
      memory.set(key, value);
    },
    removeItem: async (key) => {
      memory.delete(key);
    },
  };
}

export const authSessionStorage: AsyncKeyValueBackend =
  Platform.OS === "web"
    ? createMemoryBackend()
    : createChunkedStorage(secureStoreBackend);
