import { z } from "zod";

/**
 * Environment configuration for the BHW Care mobile app.
 *
 * Only PUBLIC client values are allowed here. Values prefixed EXPO_PUBLIC_ are
 * compiled into the app bundle. Never add a secret key (sb_secret_...), the
 * legacy service_role key, the database password, the PhilSMS token, or any
 * admin key to this file or to any .env file in this repo.
 */

const envSchema = z.object({
  supabaseUrl: z.url({
    message: "EXPO_PUBLIC_SUPABASE_URL must be a valid URL",
  }),
  supabasePublishableKey: z
    .string()
    .min(1, {
      message: "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must not be empty",
    }),
});

export type AppEnv = z.infer<typeof envSchema>;

const PLACEHOLDER_MARKERS = ["your-project-ref", "your-supabase-publishable"];

export type RawEnv = {
  supabaseUrl: string | undefined;
  supabasePublishableKey: string | undefined;
};

/**
 * Pure validation function (easy to unit test).
 * Throws an Error with a readable message when configuration is invalid.
 */
export function parseEnv(raw: RawEnv): AppEnv {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `- ${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `BHW Care environment configuration is invalid:\n${details}\n` +
        "Check your .env.local file, then restart Metro with: npx expo start --clear",
    );
  }

  if (result.data.supabasePublishableKey.startsWith("sb_secret_")) {
    throw new Error(
      "BHW Care environment contains a Supabase SECRET key (sb_secret_...).\n" +
        "Secret keys must never be placed in the mobile app. " +
        "Use the publishable key (sb_publishable_...) in .env.local instead.",
    );
  }

  const usesPlaceholder = PLACEHOLDER_MARKERS.some(
    (marker) =>
      result.data.supabaseUrl.includes(marker) ||
      result.data.supabasePublishableKey.includes(marker),
  );

  if (usesPlaceholder) {
    throw new Error(
      "BHW Care environment still contains placeholder values from .env.example.\n" +
        "Put your real Supabase project URL and publishable key in .env.local, " +
        "then restart Metro with: npx expo start --clear",
    );
  }

  return result.data;
}

let cachedEnv: AppEnv | null = null;

/**
 * Reads and validates the environment once, then caches it.
 * Note: Expo only inlines EXPO_PUBLIC_ variables when they are referenced
 * statically like process.env.EXPO_PUBLIC_NAME, so do not read them dynamically.
 */
export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = parseEnv({
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  return cachedEnv;
}
