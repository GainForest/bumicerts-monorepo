/**
 * apps/indexer/src/graphql/resolvers/_config.ts
 *
 * Configuration for the GraphQL resolver code-generator
 * (GENERATED/scripts/generate-resolvers.ts).
 *
 * THIS IS THE ONLY FILE you should ever hand-edit to control what gets
 * auto-generated vs. kept as a custom override.
 *
 * After editing, re-run:
 *   bun run gen:resolvers   (from monorepo root)
 */

// ─────────────────────────────────────────────────────────────────────────────
// EXCLUDED COLLECTIONS
//
// NSIDs listed here will NOT have any code generated for them.
// Add a collection here when its resolver needs custom logic that the generator
// cannot produce (e.g., text search, label metadata, nested sub-types).
//
// You must provide the resolver manually in resolvers/custom/*.ts.
// ─────────────────────────────────────────────────────────────────────────────

export const EXCLUDED_COLLECTIONS = new Set<string>([
  // Custom: has Hyperlabel quality labels + text search (ActivityWhereInput)
  "org.hypercerts.claim.activity",

  // Custom: has OrgInfoWhereInput text search (displayName/shortDescription/longDescription)
  "app.gainforest.organization.info",

  // Custom: DWC occurrence blobs use extractBlobRef (typed BlobRefType) rather
  // than resolveBlobsInValue (raw JSON), which gives richer GQL types for each
  // evidence field.  Keep manual so that distinction is preserved.
  "app.gainforest.dwc.occurrence",

  // Custom: EVM wallet link has nested EIP-712 proof sub-objects, a `valid`
  // boolean metadata field computed at query time from cryptographic verification,
  // and a custom EvmLinkWhereInput with a `valid` filter.
  "app.gainforest.link.evm",
]);

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTIONS THAT NEED PDS HOST BATCH PRE-FETCH
//
// When a collection's mapper calls extractBlobRef / resolveBlobsInValue for
// every row, the generator emits a simple fetchCollectionPage() call which
// resolves PDS hosts one-at-a-time on demand.
//
// For high-volume collections (or ones with many blob fields) you can list the
// NSID here to make the generator emit a getPdsHostsBatch() call before mapping,
// warming the PDS-host cache for all DIDs in one round-trip.
// ─────────────────────────────────────────────────────────────────────────────

export const PDS_BATCH_COLLECTIONS = new Set<string>([
  // Add NSIDs here as needed.
  // Example: "app.gainforest.organization.recordings.audio"
]);

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM WHERE-INPUT OVERRIDES
//
// By default every generated resolver uses the standard WhereInput
// (did/handle/and/or/not) for its query arguments.
//
// If a collection needs a richer WhereInput, map its NSID to the name of the
// Pothos InputRef exported from ../types.ts (or from a custom file).
//
// The generator will substitute this ref for WhereInputRef in the generated
// args block.  You must ensure the referenced InputRef is imported and
// available in the generated file's import chain.
//
// Note: if you add a custom WhereInput you probably also want to add the
// collection to EXCLUDED_COLLECTIONS and handle it fully in custom/.
// ─────────────────────────────────────────────────────────────────────────────

export const CUSTOM_WHERE_INPUTS: Record<string, string> = {
  // Example (only relevant if the collection is NOT excluded):
  // "org.hypercerts.claim.activity": "ActivityWhereInputRef",
};
