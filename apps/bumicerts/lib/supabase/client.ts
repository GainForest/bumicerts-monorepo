import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { clientEnv as env } from "@/lib/env/client";

/**
 * Supabase client for browser/client-side usage.
 * Uses the anon key with RLS policies.
 */
let _supabaseClient: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
  if (_supabaseClient) return _supabaseClient;
  _supabaseClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return _supabaseClient;
};

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export { getSupabaseClient };
