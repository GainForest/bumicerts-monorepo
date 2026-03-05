/**
 * ATProto Mutations Utilities (Client-Safe)
 *
 * Re-exports from @gainforest/atproto-mutations-next that are safe to use
 * in both client and server components. No server-only dependencies.
 */

// Re-export useful types and utilities
export { MutationError } from "@gainforest/atproto-mutations-next/client";
export {
  toSerializableFile,
  parseAtUri,
  computePolygonMetrics,
} from "@gainforest/atproto-mutations-next";
export type { PolygonMetrics } from "@gainforest/atproto-mutations-core";
export type { AtUri } from "@gainforest/internal-utils";
export type { SerializableFile, FileOrBlobRef } from "@gainforest/atproto-mutations-core";
export type { StrongRef } from "@gainforest/atproto-mutations-core";

import type { StrongRef } from "@gainforest/atproto-mutations-core";
import { isAtUriString } from "@atproto/lex";

/**
 * Converts plain `{ uri, cid }` objects into properly typed StrongRef values
 * for use in ATProto mutation inputs.
 *
 * Validates each `uri` as a well-formed AT-URI using the official type guard
 * from `@atproto/lex`. `cid` is structurally `string` in the lexicon so no
 * guard is needed. Throws if any URI is malformed — this is a programming
 * error, not a user error, since URIs come from certified location records
 * that the indexer already resolved.
 */
export function toStrongRefs(
  locations: { uri: string; cid: string }[]
): StrongRef[] {
  return locations.map(({ uri, cid }) => {
    if (!isAtUriString(uri)) {
      throw new Error(`toStrongRefs: invalid AT-URI: "${uri}"`);
    }
    return { uri, cid };
  });
}
