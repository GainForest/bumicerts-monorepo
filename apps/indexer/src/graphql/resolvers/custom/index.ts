/**
 * Custom resolver overrides index.
 *
 * Each file in this directory handles a collection that was excluded from
 * auto-generation (see _config.ts) due to non-standard logic:
 *
 *   hypercertsClaimActivity        - Hyperlabel labels + ActivityWhereInput text search
 *   gainforestOrganizationInfo     - OrgInfoWhereInput text search + typed BlobRefType fields
 *   gainforestOrganizationRecordingsAudio - Nested OrgAudioMetadata sub-type
 *   gainforestDwcOccurrence        - Typed BlobRefType for evidence fields
 *   impactIndexerLinkAttestation   - Nested EIP-712 message sub-type
 *
 * Imported for their side-effects: each file calls builder.objectType() to
 * attach custom fields to the namespace classes declared in generated.ts.
 *
 * Import ORDER matters when a file creates a new class and a second file
 * depends on that class being registered with Pothos first.  Order here:
 *   1. Files that only ADD fields to generated classes (no new root classes)
 *   2. Files that CREATE new sub-namespace classes
 */

// 1. Adds `activity` to generated HypercertsClaimNS
export * from "./hypercertsClaimActivity.ts";

// 2. Adds `info` to generated GainforestOrganizationNS
export * from "./gainforestOrganizationInfo.ts";

// 3. Creates GainforestOrganizationRecordingsNS, adds `recordings` to generated GainforestOrganizationNS
export * from "./gainforestOrganizationRecordingsAudio.ts";

// 4. Adds `occurrence` to generated GainforestDwcNS
export * from "./gainforestDwcOccurrence.ts";

// 5. Creates ImpactindexerLinkNS, adds `link` to generated ImpactindexerNS
export * from "./impactIndexerLinkAttestation.ts";
