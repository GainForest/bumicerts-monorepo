import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client for browser/client-side usage.
 * Uses the anon key with RLS policies.
 * 
 * Returns null if environment variables are not configured,
 * allowing the app to build without Supabase credentials.
 */
let _supabaseClient: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient | null => {
  if (_supabaseClient) return _supabaseClient;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[Supabase] Client environment variables not configured. Analytics tracking disabled.");
    return null;
  }

  _supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return _supabaseClient;
};

/**
 * @deprecated Use getSupabaseClient() instead for null-safe access.
 * This export maintained for backward compatibility but may throw if env vars missing.
 */
export const supabase = (() => {
  const client = getSupabaseClient();
  if (!client) {
    // Return a proxy that warns on usage instead of throwing at import time
    return new Proxy({} as SupabaseClient, {
      get(_, prop) {
        if (prop === 'from') {
          return () => ({
            select: () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }),
            insert: () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }),
            update: () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }),
            upsert: () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }),
            delete: () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }),
          });
        }
        return undefined;
      },
    });
  }
  return client;
})();

export { getSupabaseClient };
