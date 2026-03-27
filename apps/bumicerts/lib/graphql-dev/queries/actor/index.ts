/**
 * Actor (ATProto profile) query module.
 *
 * Fetches actor profiles from the internal API route (not GraphQL).
 * Lives here so it follows the same queries.* pattern as GraphQL queries,
 * even though the data source is a REST endpoint.
 *
 * Params: { handleOrDid: string }
 * Result: ActorProfile | null
 *
 * Leaf: queries.actor
 */

import { links } from "@/lib/links";
import type { QueryModule } from "@/lib/graphql-dev/create-query";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActorProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export type Params = { handleOrDid: string };
export type Result = ActorProfile | null;

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch(params: Params): Promise<Result> {
  const res = await globalThis.fetch(links.api.getProfile(params.handleOrDid));
  if (!res.ok) return null;
  return res.json() as Promise<ActorProfile>;
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 5 * 60 * 1_000, // 5 minutes — profiles are stable
  retry: false,
} satisfies QueryModule<Params, Result>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  const v = params.handleOrDid;
  // Only enable for DIDs (did:plc:... / did:web:...) or handles (contains a dot, no spaces)
  if (v.startsWith("did:")) return true;
  if (v.includes(".") && !v.includes(" ")) return true;
  return false;
}
