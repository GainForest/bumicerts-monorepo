import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Supabase admin client for server-side usage.
 * Uses the service role key - bypasses RLS.
 * Only use in API routes/server components.
 * 
 * Returns null if environment variables are not configured,
 * allowing the app to build without Supabase credentials.
 */
let _supabaseAdmin: SupabaseClient | null = null;

const getSupabaseAdmin = (): SupabaseClient | null => {
  if (_supabaseAdmin) return _supabaseAdmin;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn("[Supabase] Server environment variables not configured. Server-side analytics disabled.");
    return null;
  }

  _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  return _supabaseAdmin;
};

/**
 * @deprecated Use getSupabaseAdmin() instead for null-safe access.
 * This export maintained for backward compatibility but may throw if env vars missing.
 */
export const supabaseAdmin = (() => {
  const client = getSupabaseAdmin();
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

export { getSupabaseAdmin };
