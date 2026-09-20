import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { getEnv } from "@/config/env";

import { authSessionStorage } from "./secureSessionStorage";

/**
 * The single Supabase client for the BHW Care app.
 *
 * It uses only the PUBLIC publishable key. Authorization is enforced by the
 * database (Row Level Security) and server-side functions, never by this client.
 *
 * The client is created lazily on first use so that importing this file never
 * fails at startup (for example during web static rendering).
 */

let client: SupabaseClient | null = null;
let appStateListenerAttached = false;

export function getSupabase(): SupabaseClient {
  if (client) {
    return client;
  }

  const env = getEnv();

  const created = createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      storage: authSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  client = created;

  // Only refresh tokens while the app is in the foreground.
  if (Platform.OS !== "web" && !appStateListenerAttached) {
    appStateListenerAttached = true;
    AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void created.auth.startAutoRefresh();
      } else {
        void created.auth.stopAutoRefresh();
      }
    });
  }

  return created;
}
