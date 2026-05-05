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
  const data: ActorProfile = await res.json();
  return data;
}
