# New Lexicons Migration Plan

## Context

This document captures the full migration plan for updating the GraphQL schema after pulling updated
local lexicons and re-running `bun run codegen`.

Codegen now produces **31 indexed collections** (up from 27). The hypercerts-lexicon was restructured:
several collections were removed, several were added, and `org.hypercerts.claim.activity` was significantly
changed.

---

## Diff: Before → After

### Collections Removed (lexicons no longer exist)

| Collection | Old GraphQL Field |
|---|---|
| `org.hypercerts.claim.project` | `hypercerts { projects }` |
| `org.hypercerts.claim.contribution` | `hypercerts { contributions }` |
| `org.hypercerts.claim.evidence` | `hypercerts { evidences }` |

### Collections Added (need new GraphQL resolvers)

| Collection | Key Type | Suggested GraphQL Field |
|---|---|---|
| `app.certified.actor.profile` | `literal:self` | `certified { actor { profiles } }` |
| `org.hypercerts.acknowledgement` | `tid` | `hypercerts { acknowledgements }` |
| `org.hypercerts.claim.attachment` | `tid` | `hypercerts { attachments }` |
| `org.hypercerts.claim.contributionDetails` | `tid` | `hypercerts { contributionDetails }` |
| `org.hypercerts.claim.contributorInformation` | `tid` | `hypercerts { contributorInformation }` |
| `org.hypercerts.helper.workScopeTag` | `tid` | `hypercerts { helper { workScopeTags } }` |

### Collections Modified

| Collection | What Changed |
|---|---|
| `org.hypercerts.claim.activity` | Major field restructure — see details below |

### Collections Unchanged (existing resolvers are correct)

- `org.hypercerts.claim.collection`
- `org.hypercerts.claim.evaluation`
- `org.hypercerts.claim.measurement`
- `org.hypercerts.claim.rights`
- `org.hypercerts.funding.receipt`
- All `app.gainforest.*`
- All `org.impactindexer.*`

---

## Changes to `org.hypercerts.claim.activity`

### Fields Removed

| Field | Old Type |
|---|---|
| `contributions` | `[StrongRef]` |
| `location` | `StrongRef` |
| `project` | `String` |

### Fields Added

| Field | Type | Notes |
|---|---|---|
| `shortDescriptionFacets` | `JSON` | Rich text facets for `shortDescription` |
| `descriptionFacets` | `JSON` | Rich text facets for `description` |
| `contributors` | `JSON` | Array of complex contributor objects (see below) |
| `locations` | `[StrongRef]` | Plural — was a single `location` |

### Fields Changed

| Field | Old Type | New Type |
|---|---|---|
| `workScope` | `JSON` | `JSON` (now a union: `strongRef \| { $type: "...#workScopeString", scope: string }`) |
| `image` | `JSON` | `JSON` (now a union: `uri \| smallImage blob`) |

### `contributors` Object Structure

Each element in the `contributors` array is a `#contributor` object:

```typescript
{
  contributorIdentity: union(
    { $type: "org.hypercerts.claim.activity#contributorIdentity", identity: string } |
    strongRef  // to a contributorInformation record
  ),
  contributionWeight?: string,  // positive numeric string
  contributionDetails?: union(
    { $type: "org.hypercerts.claim.activity#contributorRole", role: string } |
    strongRef  // to a contributionDetails record
  )
}
```

---

## New Lexicon Field Schemas

### `app.certified.actor.profile` (singleton per DID)

```
displayName:  string (max 64 graphemes)
description:  string (max 256 graphemes)
pronouns:     string (max 20 graphemes)
website:      string (uri format)
avatar:       JSON   (union: org.hypercerts.defs#uri | org.hypercerts.defs#smallImage)
banner:       JSON   (union: org.hypercerts.defs#uri | org.hypercerts.defs#largeImage)
createdAt:    datetime
```

### `org.hypercerts.acknowledgement`

```
subject:      StrongRef  (required) — the record whose inclusion is acknowledged
context:      StrongRef  (required) — the record that includes the subject
acknowledged: boolean    (required) — true=accepted, false=rejected
comment:      string     (max 1000, optional)
createdAt:    datetime   (required)
```

### `org.hypercerts.claim.attachment`

```
subjects:               [StrongRef]  (optional, max 100)
contentType:            string       (max 64 — e.g. report, audit, evidence, testimonial)
content:                JSON         (required, array of union: uri | smallBlob, max 100)
title:                  string       (required, max 256)
shortDescription:       string       (max 300 graphemes)
shortDescriptionFacets: JSON         (richtext facets)
description:            string       (max 3000 graphemes)
descriptionFacets:      JSON         (richtext facets)
location:               StrongRef    (optional)
createdAt:              datetime     (required)
```

### `org.hypercerts.claim.contributionDetails`

```
role:                    string    (max 100)
contributionDescription: string    (max 1000 graphemes)
startDate:               datetime
endDate:                 datetime
createdAt:               datetime  (required)
```

### `org.hypercerts.claim.contributorInformation`

```
identifier:  string  (DID or social profile URI)
displayName: string  (max 100)
image:       JSON    (union: org.hypercerts.defs#uri | org.hypercerts.defs#smallImage)
createdAt:   datetime (required)
```

### `org.hypercerts.helper.workScopeTag`

```
key:               string      (required, max 120 — lowercase hyphenated machine key)
label:             string      (required, max 200 — human-readable label)
kind:              string      (max 50 — recommended: topic, language, domain, method, tag)
description:       string      (max 1000 graphemes)
parent:            StrongRef   (optional, for hierarchy)
aliases:           [string]    (optional, max 50 items, max 200 chars each)
externalReference: JSON        (union: org.hypercerts.defs#uri | org.hypercerts.defs#smallBlob)
createdAt:         datetime    (required)
```

---

## Implementation Steps

### Step 1 — Update `src/graphql/resolvers/hypercerts.ts`

#### 1a. Remove obsolete types

Delete the following entirely:
- `HcProjectType`, `HcProjectPageType`
- `HcContributionType`, `HcContributionPageType`
- `HcEvidenceType`, `HcEvidencePageType`

#### 1b. Remove obsolete mapper functions

Delete:
- `mapProject()`
- `mapContribution()`
- `mapEvidence()`

#### 1c. Update `HcActivityType`

Replace the existing type definition with:

```typescript
const HcActivityType = builder.simpleObject("HcActivity", {
  description: "A Hypercerts claim activity (org.hypercerts.claim.activity).",
  fields: (t) => ({
    meta:                   t.field({ type: HcActivityMetaType }),
    title:                  t.string({ nullable: true }),
    shortDescription:       t.string({ nullable: true }),
    shortDescriptionFacets: t.field({ type: "JSON", nullable: true }),
    description:            t.string({ nullable: true }),
    descriptionFacets:      t.field({ type: "JSON", nullable: true }),
    image:                  t.field({ type: "JSON", nullable: true }),
    workScope:              t.field({ type: "JSON", nullable: true }),
    startDate:              t.field({ type: "DateTime", nullable: true }),
    endDate:                t.field({ type: "DateTime", nullable: true }),
    contributors:           t.field({ type: "JSON", nullable: true }),
    rights:                 t.field({ type: StrongRefType, nullable: true }),
    locations:              t.field({ type: [StrongRefType], nullable: true }),
    createdAt:              t.field({ type: "DateTime", nullable: true }),
    label:                  t.field({ type: HcActivityLabelType, nullable: true }),
  }),
});
```

#### 1d. Update `mapActivity()`

Replace with:

```typescript
function mapActivity(
  row: RecordRow,
  label: { tier: string; labeler: string; labeledAt: string | null; syncedAt: string } | null = null,
) {
  const p = payload(row);
  return {
    meta: { ...rowToMeta(row), labelTier: label?.tier ?? null },
    title: s(p,"title"),
    shortDescription: s(p,"shortDescription"),
    shortDescriptionFacets: j(p,"shortDescriptionFacets"),
    description: s(p,"description"),
    descriptionFacets: j(p,"descriptionFacets"),
    image: j(p,"image"),
    workScope: j(p,"workScope"),
    startDate: s(p,"startDate"),
    endDate: s(p,"endDate"),
    contributors: j(p,"contributors"),
    rights: extractStrongRef(j(p,"rights")),
    locations: extractStrongRefs(j(p,"locations")),
    createdAt: s(p,"createdAt"),
    label,
  };
}
```

#### 1e. Add new type definitions (before the namespace objectType)

```typescript
// ── Acknowledgement ──
const HcAcknowledgementType = builder.simpleObject("HcAcknowledgement", {
  description: "Acknowledges inclusion of one record within another (org.hypercerts.acknowledgement).",
  fields: (t) => ({
    meta:         t.field({ type: RecordMetaType }),
    subject:      t.field({ type: StrongRefType, nullable: true }),
    context:      t.field({ type: StrongRefType, nullable: true }),
    acknowledged: t.boolean({ nullable: true }),
    comment:      t.string({ nullable: true }),
    createdAt:    t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcAcknowledgementPageType = builder.simpleObject("HcAcknowledgementPage", {
  fields: (t) => ({ records: t.field({ type: [HcAcknowledgementType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── Attachment ──
const HcAttachmentType = builder.simpleObject("HcAttachment", {
  description: "An attachment providing commentary, context, or evidence (org.hypercerts.claim.attachment).",
  fields: (t) => ({
    meta:                   t.field({ type: RecordMetaType }),
    subjects:               t.field({ type: [StrongRefType], nullable: true }),
    contentType:            t.string({ nullable: true }),
    content:                t.field({ type: "JSON", nullable: true }),
    title:                  t.string({ nullable: true }),
    shortDescription:       t.string({ nullable: true }),
    shortDescriptionFacets: t.field({ type: "JSON", nullable: true }),
    description:            t.string({ nullable: true }),
    descriptionFacets:      t.field({ type: "JSON", nullable: true }),
    location:               t.field({ type: StrongRefType, nullable: true }),
    createdAt:              t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcAttachmentPageType = builder.simpleObject("HcAttachmentPage", {
  fields: (t) => ({ records: t.field({ type: [HcAttachmentType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── ContributionDetails ──
const HcContributionDetailsType = builder.simpleObject("HcContributionDetails", {
  description: "Details about a specific contribution (org.hypercerts.claim.contributionDetails).",
  fields: (t) => ({
    meta:                    t.field({ type: RecordMetaType }),
    role:                    t.string({ nullable: true }),
    contributionDescription: t.string({ nullable: true }),
    startDate:               t.field({ type: "DateTime", nullable: true }),
    endDate:                 t.field({ type: "DateTime", nullable: true }),
    createdAt:               t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcContributionDetailsPageType = builder.simpleObject("HcContributionDetailsPage", {
  fields: (t) => ({ records: t.field({ type: [HcContributionDetailsType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── ContributorInformation ──
const HcContributorInformationType = builder.simpleObject("HcContributorInformation", {
  description: "Contributor information including identifier, display name, and image (org.hypercerts.claim.contributorInformation).",
  fields: (t) => ({
    meta:        t.field({ type: RecordMetaType }),
    identifier:  t.string({ nullable: true }),
    displayName: t.string({ nullable: true }),
    image:       t.field({ type: "JSON", nullable: true }),
    createdAt:   t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcContributorInformationPageType = builder.simpleObject("HcContributorInformationPage", {
  fields: (t) => ({ records: t.field({ type: [HcContributorInformationType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── WorkScopeTag ──
const HcWorkScopeTagType = builder.simpleObject("HcWorkScopeTag", {
  description: "A reusable work scope atom for taxonomy (org.hypercerts.helper.workScopeTag).",
  fields: (t) => ({
    meta:              t.field({ type: RecordMetaType }),
    key:               t.string({ nullable: true }),
    label:             t.string({ nullable: true }),
    kind:              t.string({ nullable: true }),
    description:       t.string({ nullable: true }),
    parent:            t.field({ type: StrongRefType, nullable: true }),
    aliases:           t.stringList({ nullable: true }),
    externalReference: t.field({ type: "JSON", nullable: true }),
    createdAt:         t.field({ type: "DateTime", nullable: true }),
  }),
});
const HcWorkScopeTagPageType = builder.simpleObject("HcWorkScopeTagPage", {
  fields: (t) => ({ records: t.field({ type: [HcWorkScopeTagType] }), pageInfo: t.field({ type: PageInfoType }) }),
});
```

#### 1f. Add new mapper functions

```typescript
function mapAcknowledgement(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    subject: extractStrongRef(j(p,"subject")),
    context: extractStrongRef(j(p,"context")),
    acknowledged: typeof p["acknowledged"] === "boolean" ? p["acknowledged"] : null,
    comment: s(p,"comment"),
    createdAt: s(p,"createdAt"),
  };
}

function mapAttachment(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    subjects: extractStrongRefs(j(p,"subjects")),
    contentType: s(p,"contentType"),
    content: j(p,"content"),
    title: s(p,"title"),
    shortDescription: s(p,"shortDescription"),
    shortDescriptionFacets: j(p,"shortDescriptionFacets"),
    description: s(p,"description"),
    descriptionFacets: j(p,"descriptionFacets"),
    location: extractStrongRef(j(p,"location")),
    createdAt: s(p,"createdAt"),
  };
}

function mapContributionDetails(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    role: s(p,"role"),
    contributionDescription: s(p,"contributionDescription"),
    startDate: s(p,"startDate"),
    endDate: s(p,"endDate"),
    createdAt: s(p,"createdAt"),
  };
}

function mapContributorInformation(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    identifier: s(p,"identifier"),
    displayName: s(p,"displayName"),
    image: j(p,"image"),
    createdAt: s(p,"createdAt"),
  };
}

function mapWorkScopeTag(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    key: s(p,"key"),
    label: s(p,"label"),
    kind: s(p,"kind"),
    description: s(p,"description"),
    parent: extractStrongRef(j(p,"parent")),
    aliases: arr(p,"aliases"),
    externalReference: j(p,"externalReference"),
    createdAt: s(p,"createdAt"),
  };
}
```

#### 1g. Add `HcHelperNS` class and objectType (before `HypercertsNS`)

```typescript
class HcHelperNS {}

builder.objectType(HcHelperNS, {
  name: "HcHelperNamespace",
  description: "Hypercerts helper records (org.hypercerts.helper.*).",
  fields: (t) => ({
    workScopeTags: t.field({
      type: HcWorkScopeTagPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.helper.workScopeTag", args, mapWorkScopeTag),
    }),
  }),
});
```

#### 1h. Update `HypercertsNamespace` objectType fields

Remove fields: `projects`, `contributions`, `evidences`

Add these new fields:

```typescript
acknowledgements: t.field({
  type: HcAcknowledgementPageType,
  args: {
    cursor: t.arg.string(), limit: t.arg.int(),
    where: t.arg({ type: WhereInputRef, required: false }),
    sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
  },
  resolve: (_, args) => fetchCollectionPage("org.hypercerts.acknowledgement", args, mapAcknowledgement),
}),
attachments: t.field({
  type: HcAttachmentPageType,
  args: {
    cursor: t.arg.string(), limit: t.arg.int(),
    where: t.arg({ type: WhereInputRef, required: false }),
    sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
  },
  resolve: (_, args) => fetchCollectionPage("org.hypercerts.claim.attachment", args, mapAttachment),
}),
contributionDetails: t.field({
  type: HcContributionDetailsPageType,
  args: {
    cursor: t.arg.string(), limit: t.arg.int(),
    where: t.arg({ type: WhereInputRef, required: false }),
    sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
  },
  resolve: (_, args) => fetchCollectionPage("org.hypercerts.claim.contributionDetails", args, mapContributionDetails),
}),
contributorInformation: t.field({
  type: HcContributorInformationPageType,
  args: {
    cursor: t.arg.string(), limit: t.arg.int(),
    where: t.arg({ type: WhereInputRef, required: false }),
    sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
  },
  resolve: (_, args) => fetchCollectionPage("org.hypercerts.claim.contributorInformation", args, mapContributorInformation),
}),
helper: t.field({
  type: HcHelperNS,
  description: "Helper records (org.hypercerts.helper.*).",
  resolve: () => new HcHelperNS(),
}),
```

---

### Step 2 — Create `src/graphql/resolvers/certified.ts` (NEW FILE)

Full file contents:

```typescript
/**
 * GraphQL namespace: certified
 *
 * app.certified.* records.
 *
 * Every paginated query accepts:
 *   cursor  – opaque keyset pagination token
 *   limit   – page size 1-100 (default 50)
 *   where   – identity filter { did?, handle?, and?, or?, not? }
 *   sortBy  – CREATED_AT | INDEXED_AT
 *   order   – DESC (default) | ASC
 */

import { builder } from "../builder.ts";
import {
  PageInfoType, RecordMetaType,
  SortOrderEnum, SortFieldEnum,
  rowToMeta, payload, fetchCollectionPage, WhereInputRef,
} from "../types.ts";
import type { RecordRow } from "@/db/types.ts";

// JSONB accessors
const s = (p: Record<string, unknown>, k: string): string | null => {
  const v = p[k]; if (v == null) return null;
  return typeof v === "string" ? v : String(v);
};
const j = (p: Record<string, unknown>, k: string): unknown => p[k] ?? null;

// ================================================================
// Token classes
// ================================================================

class CertifiedActorNS {}
class CertifiedNS {}

// ================================================================
// ── Actor leaf types ─────────────────────────────────────────────
// ================================================================

const CertifiedActorProfileType = builder.simpleObject("CertifiedActorProfile", {
  description: "A Hypercert account profile declaration (app.certified.actor.profile).",
  fields: (t) => ({
    meta:        t.field({ type: RecordMetaType }),
    displayName: t.string({ nullable: true }),
    description: t.string({ nullable: true }),
    pronouns:    t.string({ nullable: true }),
    website:     t.string({ nullable: true }),
    avatar:      t.field({ type: "JSON", nullable: true }),
    banner:      t.field({ type: "JSON", nullable: true }),
    createdAt:   t.field({ type: "DateTime", nullable: true }),
  }),
});
const CertifiedActorProfilePageType = builder.simpleObject("CertifiedActorProfilePage", {
  fields: (t) => ({ records: t.field({ type: [CertifiedActorProfileType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

function mapActorProfile(row: RecordRow) {
  const p = payload(row);
  return {
    meta: rowToMeta(row),
    displayName: s(p,"displayName"),
    description: s(p,"description"),
    pronouns:    s(p,"pronouns"),
    website:     s(p,"website"),
    avatar:      j(p,"avatar"),
    banner:      j(p,"banner"),
    createdAt:   s(p,"createdAt"),
  };
}

// ── Actor namespace ──

builder.objectType(CertifiedActorNS, {
  name: "CertifiedActorNamespace",
  description: "Certified actor records (app.certified.actor.*).",
  fields: (t) => ({
    profiles: t.field({
      type: CertifiedActorProfilePageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.certified.actor.profile", args, mapActorProfile),
    }),
  }),
});

// ── Certified root namespace ──

builder.objectType(CertifiedNS, {
  name: "CertifiedNamespace",
  description: "All Certified AT Protocol records (app.certified.*).",
  fields: (t) => ({
    actor: t.field({
      type: CertifiedActorNS,
      description: "Certified actor records.",
      resolve: () => new CertifiedActorNS(),
    }),
  }),
});

builder.queryFields((t) => ({
  certified: t.field({
    type: CertifiedNS,
    description: "All Certified indexed records, grouped by namespace.",
    resolve: () => new CertifiedNS(),
  }),
}));
```

---

### Step 3 — Update `src/graphql/schema.ts`

Add one import line after the existing resolver imports:

```typescript
import "./resolvers/certified.ts";
```

The full file should look like:

```typescript
import { builder } from "./builder.ts";

import "./types.ts";
import "./resolvers/gainforest.ts";
import "./resolvers/hypercerts.ts";
import "./resolvers/impactIndexer.ts";
import "./resolvers/stats.ts";
import "./resolvers/tap.ts";
import "./resolvers/certified.ts";   // ← add this

builder.queryType({
  description: "GainForest AT Protocol record index.",
});

export const schema = builder.toSchema();
```

---

## Verification

After all changes are applied, run:

```bash
bun run typecheck   # must pass with zero errors
bun run dev         # start the server
```

Then test in the GraphQL playground:

```graphql
# Updated activity fields
{ hypercerts { activities { records { title contributors locations shortDescriptionFacets } } } }

# New acknowledgements
{ hypercerts { acknowledgements { records { subject { uri cid } context { uri cid } acknowledged comment } } } }

# New attachments
{ hypercerts { attachments { records { title subjects { uri cid } contentType content } } } }

# New contributionDetails
{ hypercerts { contributionDetails { records { role contributionDescription startDate endDate } } } }

# New contributorInformation
{ hypercerts { contributorInformation { records { identifier displayName image } } } }

# New helper namespace
{ hypercerts { helper { workScopeTags { records { key label kind description aliases } } } } }

# New certified namespace
{ certified { actor { profiles { records { displayName description website } } } } }
```
