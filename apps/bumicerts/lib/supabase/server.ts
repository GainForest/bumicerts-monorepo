import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { serverEnv as env } from "@/lib/env/server";

/**
 * Supabase admin client for server-side usage.
 * Uses the service role key - bypasses RLS.
 * Only use in API routes/server components.
 */
let _supabaseAdmin: SupabaseClient | null = null;

const getSupabaseAdmin = (): SupabaseClient => {
  if (_supabaseAdmin) return _supabaseAdmin;
  _supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  return _supabaseAdmin;
};

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export { getSupabaseAdmin };
