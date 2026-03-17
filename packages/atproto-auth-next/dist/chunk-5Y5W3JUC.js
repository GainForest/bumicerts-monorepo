// src/stores/session-store.ts
var TABLE = "atproto_oauth_session";
function createSupabaseSessionStore(supabase, appId) {
  const key = (did) => `${appId}:${did}`;
  return {
    async get(did) {
      const { data, error } = await supabase
        .from(TABLE)
        .select("value")
        .eq("id", key(did))
        .single();
      if (error?.code === "PGRST116") return void 0;
      if (error) throw new Error(`session store get: ${error.message}`);
      if (!data) return void 0;
      return data.value;
    },
    async set(did, session) {
      const { data, error } = await supabase
        .from(TABLE)
        .upsert(
          {
            id: key(did),
            app_id: appId,
            did,
            value: session,
            updated_at: /* @__PURE__ */ new Date().toISOString(),
          },
          { onConflict: "id" },
        )
        .select();
    },
    async del(did) {
      const { error } = await supabase.from(TABLE).delete().eq("id", key(did));
      if (error) throw new Error(`session store del: ${error.message}`);
    },
  };
}

// src/stores/state-store.ts
var TABLE2 = "atproto_oauth_state";
var TTL_MS = 60 * 60 * 1e3;
function createSupabaseStateStore(supabase, appId) {
  const key = (k) => `${appId}:${k}`;
  return {
    async get(k) {
      const { data, error } = await supabase
        .from(TABLE2)
        .select("value, expires_at")
        .eq("id", key(k))
        .single();
      if (error?.code === "PGRST116") return void 0;
      if (error) throw new Error(`state store get: ${error.message}`);
      if (!data) return void 0;
      if (new Date(data.expires_at) < /* @__PURE__ */ new Date()) {
        await supabase.from(TABLE2).delete().eq("id", key(k));
        throw new Error("OAuth state expired");
      }
      return data.value;
    },
    async set(k, state) {
      const { error } = await supabase.from(TABLE2).upsert(
        {
          id: key(k),
          app_id: appId,
          value: state,
          expires_at: new Date(Date.now() + TTL_MS).toISOString(),
        },
        { onConflict: "id" },
      );
      if (error) throw new Error(`state store set: ${error.message}`);
    },
    async del(k) {
      const { error } = await supabase.from(TABLE2).delete().eq("id", key(k));
      if (error) throw new Error(`state store del: ${error.message}`);
    },
  };
}
async function cleanupExpiredStates(supabase) {
  const { data, error } = await supabase
    .from(TABLE2)
    .delete()
    .lt("expires_at", /* @__PURE__ */ new Date().toISOString())
    .select("id");
  if (error) throw new Error(`state store cleanup: ${error.message}`);
  return data?.length ?? 0;
}

export {
  createSupabaseSessionStore,
  createSupabaseStateStore,
  cleanupExpiredStates,
};
//# sourceMappingURL=chunk-5Y5W3JUC.js.map
