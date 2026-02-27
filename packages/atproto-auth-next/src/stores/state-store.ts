import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NodeSavedState,
  NodeSavedStateStore,
} from "@atproto/oauth-client-node";

const TABLE = "atproto_oauth_state";
const TTL_MS = 60 * 60 * 1000;

export function createSupabaseStateStore(
  supabase: SupabaseClient,
  appId: string
): NodeSavedStateStore {
  const key = (k: string) => `${appId}:${k}`;

  return {
    async get(k: string): Promise<NodeSavedState | undefined> {
      const { data, error } = await supabase
        .from(TABLE)
        .select("value, expires_at")
        .eq("id", key(k))
        .single();

      if (error?.code === "PGRST116") return undefined;
      if (error) throw new Error(`state store get: ${error.message}`);
      if (!data) return undefined;

      if (new Date(data.expires_at) < new Date()) {
        await supabase.from(TABLE).delete().eq("id", key(k));
        throw new Error("OAuth state expired");
      }

      return data.value as NodeSavedState;
    },

    async set(k: string, state: NodeSavedState): Promise<void> {
      const { error } = await supabase.from(TABLE).upsert(
        {
          id: key(k),
          app_id: appId,
          value: state,
          expires_at: new Date(Date.now() + TTL_MS).toISOString(),
        },
        { onConflict: "id" }
      );

      if (error) throw new Error(`state store set: ${error.message}`);
    },

    async del(k: string): Promise<void> {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq("id", key(k));

      if (error) throw new Error(`state store del: ${error.message}`);
    },
  };
}

export async function cleanupExpiredStates(
  supabase: SupabaseClient
): Promise<number> {
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) throw new Error(`state store cleanup: ${error.message}`);

  return data?.length ?? 0;
}
