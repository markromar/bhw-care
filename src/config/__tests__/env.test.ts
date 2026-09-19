import { parseEnv } from "../env";

describe("parseEnv", () => {
  it("accepts a valid URL and a non-empty public key", () => {
    const raw = {
      supabaseUrl: "https://abcdefgh.supabase.co",
      supabaseAnonKey: "test-public-key",
    };

    expect(parseEnv(raw)).toEqual(raw);
  });

  it("rejects a malformed URL", () => {
    expect(() =>
      parseEnv({
        supabaseUrl: "not-a-url",
        supabaseAnonKey: "test-public-key",
      }),
    ).toThrow(/invalid/);
  });

  it("rejects an empty public key", () => {
    expect(() =>
      parseEnv({
        supabaseUrl: "https://abcdefgh.supabase.co",
        supabaseAnonKey: "",
      }),
    ).toThrow(/invalid/);
  });

  it("rejects missing values", () => {
    expect(() =>
      parseEnv({ supabaseUrl: undefined, supabaseAnonKey: undefined }),
    ).toThrow(/invalid/);
  });

  it("rejects the placeholder values copied from .env.example", () => {
    expect(() =>
      parseEnv({
        supabaseUrl: "https://your-project-ref.supabase.co",
        supabaseAnonKey: "your-public-anon-or-publishable-key",
      }),
    ).toThrow(/placeholder/);
  });
});
