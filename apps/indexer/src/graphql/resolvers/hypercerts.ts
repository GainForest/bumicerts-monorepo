/**
 * GraphQL namespace: hypercerts
 *
 * Every paginated query accepts:
 *   cursor, limit, did, handle, sortBy, order
 *
 * The `activity` query additionally accepts:
 *   labelTier – filter to records whose author DID has a specific Hyperlabel
 *               quality tier: "high-quality" | "standard" | "draft" | "likely-test"
 *
 * Every leaf returns:
 *   { data: [XxxItem!]!, pageInfo: { endCursor, hasNextPage, count } }
 *
 * Each item has:
 *   metadata   – AT Protocol envelope + collection-specific extras (labelTier, label for activities)
 *   creatorInfo – resolved org name + logo from gainforest.organization.info
 *   record      – pure lexicon payload fields only
 */

import { builder } from "../builder.ts";
import {
  PageInfoType, RecordMetaType, StrongRefType, CreatorInfoType,
  SortOrderEnum, SortFieldEnum,
  rowToMeta, payload, extractStrongRef, extractStrongRefs,
  resolveBlobsInValue,
  fetchCollectionPage, toPageInfo, WhereInputRef,
  ActivityWhereInputRef, activityWhereToFilter, activityWhereHasText,
  resolveCreatorInfo,
} from "../types.ts";
import type { ActivityWhereInput } from "../types.ts";
import { getRecordsByCollection, getLabelsByDids, getActivityLabelDids, searchActivities } from "@/db/queries.ts";
import { resolveActorToDid } from "../identity.ts";
import { getPdsHostsBatch } from "@/identity/pds.ts";
import { refreshLabelsAsync, HYPERLABEL_DID } from "@/labeller/hyperlabel.ts";
import type { RecordRow } from "@/db/types.ts";

// JSONB accessors
const s = (p: Record<string, unknown>, k: string): string | null => {
  const v = p[k]; if (v == null) return null;
  return typeof v === "string" ? v : String(v);
};
const arr = (p: Record<string, unknown>, k: string): string[] | null => {
  const v = p[k]; return Array.isArray(v) ? v.map(String) : null;
};
const j = (p: Record<string, unknown>, k: string): unknown => p[k] ?? null;

class HypercertsNS {}
class HcContextNS {}
class HcWorkscopeNS {}
class HcFractionNS {}
class HcOrderNS {}
class HyperboardsNS {}

// ── Activity metadata type (envelope + label extras) ──

/**
 * Metadata for an activity record: the full AT Protocol envelope plus
 * Hyperlabel quality information.
 *
 * `labelTier` and `label` live here (not in `record`) because they are
 * indexer-derived metadata, not part of the lexicon payload.
 */
const HcActivityMetadataType = builder.simpleObject("HcActivityMetadata", {
  description:
    "AT Protocol envelope fields for an activity record, including optional Hyperlabel quality metadata.",
  fields: (t) => ({
    uri:        t.string({ description: "Full AT-URI (at://did/collection/rkey)" }),
    did:        t.string({ description: "DID of the record author" }),
    collection: t.string({ description: "Lexicon collection NSID" }),
    rkey:       t.string({ description: "Record key (TID or literal)" }),
    cid:        t.string({ description: "Content hash (CID)" }),
    indexedAt:  t.field({ type: "DateTime", description: "When the indexer stored this record" }),
    createdAt:  t.field({ type: "DateTime", nullable: true, description: "Creation time from record payload" }),
    labelTier:  t.string({
      nullable: true,
      description:
        "Hyperlabel quality tier for this record's author: high-quality | standard | draft | likely-test. " +
        "Null if the author has not been labelled yet.",
    }),
    label: t.field({
      type: builder.simpleObject("HcActivityLabel", {
        description: "Quality label from the Hyperlabel labeller (einstein.climateai.org).",
        fields: (t) => ({
          tier:      t.string({ description: "Quality tier: high-quality | standard | draft | likely-test" }),
          labeler:   t.string({ description: "DID of the labeller that issued this label" }),
          labeledAt: t.field({ type: "DateTime", nullable: true, description: "When the labeller applied this label" }),
          syncedAt:  t.field({ type: "DateTime", description: "When the indexer last synced this label" }),
        }),
      }),
      nullable: true,
      description: "Full quality label object from Hyperlabel (null if author not yet labelled).",
    }),
  }),
});

// ── Pure record types (lexicon payload only) ──

const HcActivityRecordType = builder.simpleObject("HcActivityRecord", {
  description: "Pure payload for a Hypercerts claim activity (org.hypercerts.claim.activity).",
  fields: (t) => ({
    title:                  t.string({ nullable: true }),
    shortDescription:       t.string({ nullable: true }),
    shortDescriptionFacets: t.field({ type: "JSON", nullable: true }),
    description:            t.field({ type: "JSON", nullable: true, description: "Rich-text description as a Leaflet linear document" }),
    image:                  t.field({ type: "JSON", nullable: true }),
    workScope:              t.field({ type: "JSON", nullable: true, description: "Work scope: CEL expression or free-form string" }),
    startDate:              t.field({ type: "DateTime", nullable: true }),
    endDate:                t.field({ type: "DateTime", nullable: true }),
    contributors:           t.field({ type: "JSON", nullable: true }),
    rights:                 t.field({ type: StrongRefType, nullable: true }),
    locations:              t.field({ type: [StrongRefType], nullable: true }),
    createdAt:              t.field({ type: "DateTime", nullable: true }),
  }),
});

const HcCollectionRecordType = builder.simpleObject("HcCollectionRecord", {
  description: "Pure payload for a Hypercerts collection (org.hypercerts.collection).",
  fields: (t) => ({
    type:             t.string({ nullable: true, description: "Collection type, e.g. 'favorites', 'project'" }),
    title:            t.string({ nullable: true }),
    shortDescription: t.string({ nullable: true }),
    description:      t.field({ type: "JSON", nullable: true, description: "Rich-text description as a Leaflet linear document" }),
    avatar:           t.field({ type: "JSON", nullable: true, description: "Avatar as URI or image blob" }),
    banner:           t.field({ type: "JSON", nullable: true, description: "Banner image as URI or large image blob" }),
    items:            t.field({ type: "JSON", nullable: true, description: "Array of items with optional weights" }),
    location:         t.field({ type: StrongRefType, nullable: true }),
    createdAt:        t.field({ type: "DateTime", nullable: true }),
  }),
});

const HcEvaluationRecordType = builder.simpleObject("HcEvaluationRecord", {
  description: "Pure payload for a Hypercerts context evaluation (org.hypercerts.context.evaluation).",
  fields: (t) => ({
    subject:      t.field({ type: StrongRefType, nullable: true }),
    evaluators:   t.stringList({ nullable: true }),
    content:      t.field({ type: "JSON", nullable: true }),
    measurements: t.field({ type: [StrongRefType], nullable: true }),
    summary:      t.string({ nullable: true }),
    score:        t.field({ type: "JSON", nullable: true }),
    location:     t.field({ type: StrongRefType, nullable: true }),
    createdAt:    t.field({ type: "DateTime", nullable: true }),
  }),
});

const HcMeasurementRecordType = builder.simpleObject("HcMeasurementRecord", {
  description: "Pure payload for a Hypercerts context measurement (org.hypercerts.context.measurement).",
  fields: (t) => ({
    subject:     t.field({ type: StrongRefType, nullable: true }),
    measurers:   t.stringList({ nullable: true }),
    metric:      t.string({ nullable: true }),
    value:       t.string({ nullable: true }),
    methodType:  t.string({ nullable: true }),
    methodURI:   t.string({ nullable: true }),
    evidenceURI: t.stringList({ nullable: true }),
    location:    t.field({ type: StrongRefType, nullable: true }),
    createdAt:   t.field({ type: "DateTime", nullable: true }),
  }),
});

const HcRightsRecordType = builder.simpleObject("HcRightsRecord", {
  description: "Pure payload for a Hypercerts claim rights record (org.hypercerts.claim.rights).",
  fields: (t) => ({
    rightsName:        t.string({ nullable: true }),
    rightsType:        t.string({ nullable: true }),
    rightsDescription: t.string({ nullable: true }),
    attachment:        t.field({ type: "JSON", nullable: true }),
    createdAt:         t.field({ type: "DateTime", nullable: true }),
  }),
});

const HcFundingReceiptRecordType = builder.simpleObject("HcFundingReceiptRecord", {
  description: "Pure payload for a Hypercerts funding receipt (org.hypercerts.funding.receipt).",
  fields: (t) => ({
    from:           t.string({ nullable: true }),
    to:             t.string({ nullable: true }),
    amount:         t.string({ nullable: true }),
    currency:       t.string({ nullable: true }),
    paymentRail:    t.string({ nullable: true }),
    paymentNetwork: t.string({ nullable: true }),
    transactionId:  t.string({ nullable: true }),
    for:            t.string({ nullable: true }),
    notes:          t.string({ nullable: true }),
    occurredAt:     t.field({ type: "DateTime", nullable: true }),
    createdAt:      t.field({ type: "DateTime", nullable: true }),
  }),
});

const HcAcknowledgementRecordType = builder.simpleObject("HcAcknowledgementRecord", {
  description: "Pure payload for an acknowledgement record (org.hypercerts.context.acknowledgement).",
  fields: (t) => ({
    subject:      t.field({ type: StrongRefType, nullable: true }),
    context:      t.field({ type: StrongRefType, nullable: true }),
    acknowledged: t.boolean({ nullable: true }),
    comment:      t.string({ nullable: true }),
    createdAt:    t.field({ type: "DateTime", nullable: true }),
  }),
});

const HcAttachmentRecordType = builder.simpleObject("HcAttachmentRecord", {
  description: "Pure payload for an attachment record (org.hypercerts.context.attachment).",
  fields: (t) => ({
    subjects:               t.field({ type: [StrongRefType], nullable: true }),
    contentType:            t.string({ nullable: true }),
    content:                t.field({ type: "JSON", nullable: true }),
    title:                  t.string({ nullable: true }),
    shortDescription:       t.string({ nullable: true }),
    shortDescriptionFacets: t.field({ type: "JSON", nullable: true }),
    description:            t.field({ type: "JSON", nullable: true, description: "Rich-text description as a Leaflet linear document" }),
    location:               t.field({ type: StrongRefType, nullable: true }),
    createdAt:              t.field({ type: "DateTime", nullable: true }),
  }),
});

const HcContributionRecordType = builder.simpleObject("HcContributionRecord", {
  description: "Pure payload for contribution details (org.hypercerts.claim.contribution).",
  fields: (t) => ({
    role:                    t.string({ nullable: true }),
    contributionDescription: t.string({ nullable: true }),
    startDate:               t.field({ type: "DateTime", nullable: true }),
    endDate:                 t.field({ type: "DateTime", nullable: true }),
    createdAt:               t.field({ type: "DateTime", nullable: true }),
  }),
});

const HcContributorInformationRecordType = builder.simpleObject("HcContributorInformationRecord", {
  description: "Pure payload for contributor information (org.hypercerts.claim.contributorInformation).",
  fields: (t) => ({
    identifier:  t.string({ nullable: true }),
    displayName: t.string({ nullable: true }),
    image:       t.field({ type: "JSON", nullable: true }),
    createdAt:   t.field({ type: "DateTime", nullable: true }),
  }),
});

const HcWorkScopeTagRecordType = builder.simpleObject("HcWorkScopeTagRecord", {
  description: "Pure payload for a work scope tag (org.hypercerts.workscope.tag).",
  fields: (t) => ({
    key:               t.string({ nullable: true }),
    label:             t.string({ nullable: true }),
    kind:              t.string({ nullable: true }),
    description:       t.string({ nullable: true }),
    parent:            t.field({ type: StrongRefType, nullable: true }),
    aliases:           t.stringList({ nullable: true }),
    externalReference: t.field({ type: "JSON", nullable: true }),
    deprecated:        t.field({ type: StrongRefType, nullable: true, description: "Points to replacement tag if deprecated" }),
    createdAt:         t.field({ type: "DateTime", nullable: true }),
  }),
});

// ── Hyperboards record types ──

const HbBoardRecordType = builder.simpleObject("HbBoardRecord", {
  description: "Pure payload for a hyperboard (org.hyperboards.board).",
  fields: (t) => ({
    subject:            t.field({ type: StrongRefType, nullable: true, description: "Reference to the activity or collection this board visualizes" }),
    config:             t.field({ type: "JSON", nullable: true, description: "Board-level visual configuration" }),
    contributorConfigs: t.field({ type: "JSON", nullable: true, description: "Per-contributor configuration entries" }),
    createdAt:          t.field({ type: "DateTime", nullable: true }),
  }),
});

const HbDisplayProfileRecordType = builder.simpleObject("HbDisplayProfileRecord", {
  description: "Pure payload for a hyperboard display profile (org.hyperboards.displayProfile).",
  fields: (t) => ({
    displayName:    t.string({ nullable: true }),
    image:          t.field({ type: "JSON", nullable: true }),
    video:          t.field({ type: "JSON", nullable: true }),
    hoverImage:     t.field({ type: "JSON", nullable: true }),
    hoverIframeUrl: t.string({ nullable: true }),
    url:            t.string({ nullable: true }),
    createdAt:      t.field({ type: "DateTime", nullable: true }),
  }),
});

// ── Fraction record types ──

const HcSaleEventRecordType = builder.simpleObject("HcSaleEventRecord", {
  description: "Pure payload for a fraction sale event (org.hypercerts.fraction.saleEvent).",
  fields: (t) => ({
    activityClaimUri: t.string({ nullable: true, description: "AT-URI of the associated activity claim" }),
    buyer:            t.string({ nullable: true, description: "DID of the buyer (omitted if anonymous)" }),
    amount:           t.string({ nullable: true, description: "Amount paid as a numeric string" }),
    currency:         t.string({ nullable: true, description: "Fiat currency (e.g. USD, EUR)" }),
    receipt:          t.string({ nullable: true, description: "AT-URI of the funding receipt proving the transaction" }),
    createdAt:        t.field({ type: "DateTime", nullable: true }),
  }),
});

const HcTransferEventRecordType = builder.simpleObject("HcTransferEventRecord", {
  description: "Pure payload for a fraction transfer event (org.hypercerts.fraction.transferEvent).",
  fields: (t) => ({
    activityClaimUri: t.string({ nullable: true, description: "AT-URI of the associated activity claim" }),
    from:             t.string({ nullable: true, description: "DID of the sender (omitted if anonymous)" }),
    to:               t.string({ nullable: true, description: "DID of the recipient" }),
    amount:           t.string({ nullable: true, description: "Amount transferred as a numeric string" }),
    currency:         t.string({ nullable: true, description: "Fiat currency (e.g. USD, EUR)" }),
    signedAt:         t.field({ type: "DateTime", nullable: true, description: "Timestamp embedded in the signed message payload" }),
    nonce:            t.string({ nullable: true, description: "Nonce included in the signed message" }),
    chainId:          t.string({ nullable: true, description: "EVM chain ID on which this transfer was signed" }),
    signerEVMAddress: t.string({ nullable: true, description: "EVM address of the signer in checksummed hex format" }),
    signature:        t.string({ nullable: true, description: "Cryptographic signature over the transfer message payload" }),
    createdAt:        t.field({ type: "DateTime", nullable: true }),
  }),
});

// ── Order record types ──

const HcListingRecordType = builder.simpleObject("HcListingRecord", {
  description: "Pure payload for a sale listing (org.hypercerts.order.listing).",
  fields: (t) => ({
    goal:         t.string({ nullable: true, description: "Fundraising goal amount as a numeric string" }),
    currency:     t.string({ nullable: true, description: "Fiat currency in which fractions are priced" }),
    allowOversell: t.boolean({ nullable: true, description: "Whether sales are accepted after goal is reached" }),
    status:       t.string({ nullable: true, description: "Listing status: open | paused | closed" }),
    updatedAt:    t.field({ type: "DateTime", nullable: true }),
    createdAt:    t.field({ type: "DateTime", nullable: true }),
  }),
});

// ── Item wrapper types ──

const HcActivityItemType = builder.simpleObject("HcActivityItem", {
  description: "A Hypercerts claim activity (org.hypercerts.claim.activity).",
  fields: (t) => ({
    metadata:    t.field({ type: HcActivityMetadataType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HcActivityRecordType }),
  }),
});
const HcActivityPageType = builder.simpleObject("HcActivityPage", {
  fields: (t) => ({ data: t.field({ type: [HcActivityItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcCollectionItemType = builder.simpleObject("HcCollectionItem", {
  description: "A Hypercerts collection (org.hypercerts.collection).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HcCollectionRecordType }),
  }),
});
const HcCollectionPageType = builder.simpleObject("HcCollectionPage", {
  fields: (t) => ({ data: t.field({ type: [HcCollectionItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcEvaluationItemType = builder.simpleObject("HcEvaluationItem", {
  description: "A Hypercerts context evaluation (org.hypercerts.context.evaluation).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HcEvaluationRecordType }),
  }),
});
const HcEvaluationPageType = builder.simpleObject("HcEvaluationPage", {
  fields: (t) => ({ data: t.field({ type: [HcEvaluationItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcMeasurementItemType = builder.simpleObject("HcMeasurementItem", {
  description: "A Hypercerts context measurement (org.hypercerts.context.measurement).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HcMeasurementRecordType }),
  }),
});
const HcMeasurementPageType = builder.simpleObject("HcMeasurementPage", {
  fields: (t) => ({ data: t.field({ type: [HcMeasurementItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcRightsItemType = builder.simpleObject("HcRightsItem", {
  description: "A Hypercerts claim rights record (org.hypercerts.claim.rights).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HcRightsRecordType }),
  }),
});
const HcRightsPageType = builder.simpleObject("HcRightsPage", {
  fields: (t) => ({ data: t.field({ type: [HcRightsItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcFundingReceiptItemType = builder.simpleObject("HcFundingReceiptItem", {
  description: "A Hypercerts funding receipt (org.hypercerts.funding.receipt).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HcFundingReceiptRecordType }),
  }),
});
const HcFundingReceiptPageType = builder.simpleObject("HcFundingReceiptPage", {
  fields: (t) => ({ data: t.field({ type: [HcFundingReceiptItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcAcknowledgementItemType = builder.simpleObject("HcAcknowledgementItem", {
  description: "An acknowledgement record (org.hypercerts.context.acknowledgement).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HcAcknowledgementRecordType }),
  }),
});
const HcAcknowledgementPageType = builder.simpleObject("HcAcknowledgementPage", {
  fields: (t) => ({ data: t.field({ type: [HcAcknowledgementItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcAttachmentItemType = builder.simpleObject("HcAttachmentItem", {
  description: "An attachment providing commentary, context, or evidence (org.hypercerts.context.attachment).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HcAttachmentRecordType }),
  }),
});
const HcAttachmentPageType = builder.simpleObject("HcAttachmentPage", {
  fields: (t) => ({ data: t.field({ type: [HcAttachmentItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcContributionItemType = builder.simpleObject("HcContributionItem", {
  description: "Details about a specific contribution (org.hypercerts.claim.contribution).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HcContributionRecordType }),
  }),
});
const HcContributionPageType = builder.simpleObject("HcContributionPage", {
  fields: (t) => ({ data: t.field({ type: [HcContributionItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcContributorInformationItemType = builder.simpleObject("HcContributorInformationItem", {
  description: "Contributor information (org.hypercerts.claim.contributorInformation).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HcContributorInformationRecordType }),
  }),
});
const HcContributorInformationPageType = builder.simpleObject("HcContributorInformationPage", {
  fields: (t) => ({ data: t.field({ type: [HcContributorInformationItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcWorkScopeTagItemType = builder.simpleObject("HcWorkScopeTagItem", {
  description: "A reusable work scope atom for taxonomy (org.hypercerts.workscope.tag).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HcWorkScopeTagRecordType }),
  }),
});
const HcWorkScopeTagPageType = builder.simpleObject("HcWorkScopeTagPage", {
  fields: (t) => ({ data: t.field({ type: [HcWorkScopeTagItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── Hyperboards item types ──

const HbBoardItemType = builder.simpleObject("HbBoardItem", {
  description: "A hyperboard record (org.hyperboards.board).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HbBoardRecordType }),
  }),
});
const HbBoardPageType = builder.simpleObject("HbBoardPage", {
  fields: (t) => ({ data: t.field({ type: [HbBoardItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HbDisplayProfileItemType = builder.simpleObject("HbDisplayProfileItem", {
  description: "A hyperboard display profile (org.hyperboards.displayProfile).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HbDisplayProfileRecordType }),
  }),
});
const HbDisplayProfilePageType = builder.simpleObject("HbDisplayProfilePage", {
  fields: (t) => ({ data: t.field({ type: [HbDisplayProfileItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── Fraction item types ──

const HcSaleEventItemType = builder.simpleObject("HcSaleEventItem", {
  description: "A fraction sale event (org.hypercerts.fraction.saleEvent).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HcSaleEventRecordType }),
  }),
});
const HcSaleEventPageType = builder.simpleObject("HcSaleEventPage", {
  fields: (t) => ({ data: t.field({ type: [HcSaleEventItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const HcTransferEventItemType = builder.simpleObject("HcTransferEventItem", {
  description: "A fraction transfer event (org.hypercerts.fraction.transferEvent).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HcTransferEventRecordType }),
  }),
});
const HcTransferEventPageType = builder.simpleObject("HcTransferEventPage", {
  fields: (t) => ({ data: t.field({ type: [HcTransferEventItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── Order item types ──

const HcListingItemType = builder.simpleObject("HcListingItem", {
  description: "A sale listing (org.hypercerts.order.listing).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: HcListingRecordType }),
  }),
});
const HcListingPageType = builder.simpleObject("HcListingPage", {
  fields: (t) => ({ data: t.field({ type: [HcListingItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── Row mappers ──

async function mapActivity(
  row: RecordRow,
  label: { tier: string; labeler: string; labeledAt: string | null; syncedAt: string } | null = null,
) {
  const p = payload(row);
  return {
    metadata: {
      ...rowToMeta(row),
      labelTier: label?.tier ?? null,
      label,
    },
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      title: s(p,"title"),
      shortDescription: s(p,"shortDescription"),
      shortDescriptionFacets: j(p,"shortDescriptionFacets"),
      description: j(p,"description"), // Now a LinearDocument object, not a string
      image: await resolveBlobsInValue(j(p,"image"), row.did),
      workScope: j(p,"workScope"),
      startDate: s(p,"startDate"),
      endDate: s(p,"endDate"),
      contributors: j(p,"contributors"),
      rights: extractStrongRef(j(p,"rights")),
      locations: extractStrongRefs(j(p,"locations")),
      createdAt: s(p,"createdAt"),
    },
  };
}

async function mapCollection(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      type: s(p,"type"),
      title: s(p,"title"),
      shortDescription: s(p,"shortDescription"),
      description: j(p,"description"), // LinearDocument
      avatar: await resolveBlobsInValue(j(p,"avatar"), row.did),
      banner: await resolveBlobsInValue(j(p,"banner"), row.did),
      items: j(p,"items"),
      location: extractStrongRef(j(p,"location")),
      createdAt:  s(p,"createdAt"),
    },
  };
}

async function mapEvaluation(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      subject: extractStrongRef(j(p,"subject")),
      evaluators: arr(p,"evaluators"), content: j(p,"content"),
      measurements: extractStrongRefs(j(p,"measurements")),
      summary: s(p,"summary"), score: j(p,"score"),
      location: extractStrongRef(j(p,"location")),
      createdAt: s(p,"createdAt"),
    },
  };
}

async function mapMeasurement(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      subject: extractStrongRef(j(p,"subject")),
      measurers: arr(p,"measurers"), metric: s(p,"metric"),
      value: s(p,"value"), methodType: s(p,"methodType"), methodURI: s(p,"methodURI"),
      evidenceURI: arr(p,"evidenceURI"),
      location: extractStrongRef(j(p,"location")),
      createdAt: s(p,"createdAt"),
    },
  };
}

async function mapRights(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      rightsName: s(p,"rightsName"), rightsType: s(p,"rightsType"),
      rightsDescription: s(p,"rightsDescription"), attachment: j(p,"attachment"),
      createdAt: s(p,"createdAt"),
    },
  };
}

async function mapFundingReceipt(row: RecordRow) {
  const p = payload(row);
  const fromRaw = j(p,"from");
  const from = typeof fromRaw === "string"
    ? fromRaw
    : (fromRaw != null && typeof fromRaw === "object")
      ? (s(fromRaw as Record<string,unknown>, "did") ?? s(fromRaw as Record<string,unknown>, "$link") ?? null)
      : null;
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      from, to: s(p,"to"), amount: s(p,"amount"),
      currency: s(p,"currency"), paymentRail: s(p,"paymentRail"),
      paymentNetwork: s(p,"paymentNetwork"), transactionId: s(p,"transactionId"),
      for: s(p,"for"), notes: s(p,"notes"),
      occurredAt: s(p,"occurredAt"), createdAt: s(p,"createdAt"),
    },
  };
}

async function mapAcknowledgement(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      subject: extractStrongRef(j(p,"subject")),
      context: extractStrongRef(j(p,"context")),
      acknowledged: typeof p["acknowledged"] === "boolean" ? p["acknowledged"] : null,
      comment: s(p,"comment"),
      createdAt: s(p,"createdAt"),
    },
  };
}

async function mapAttachment(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      subjects: extractStrongRefs(j(p,"subjects")),
      contentType: s(p,"contentType"),
      content: await resolveBlobsInValue(j(p,"content"), row.did),
      title: s(p,"title"),
      shortDescription: s(p,"shortDescription"),
      shortDescriptionFacets: j(p,"shortDescriptionFacets"),
      description: j(p,"description"), // LinearDocument
      location: extractStrongRef(j(p,"location")),
      createdAt: s(p,"createdAt"),
    },
  };
}

async function mapContribution(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      role: s(p,"role"),
      contributionDescription: s(p,"contributionDescription"),
      startDate: s(p,"startDate"),
      endDate: s(p,"endDate"),
      createdAt: s(p,"createdAt"),
    },
  };
}

async function mapContributorInformation(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      identifier: s(p,"identifier"),
      displayName: s(p,"displayName"),
      image: await resolveBlobsInValue(j(p,"image"), row.did),
      createdAt: s(p,"createdAt"),
    },
  };
}

async function mapWorkScopeTag(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      key: s(p,"key"),
      label: s(p,"label"),
      kind: s(p,"kind"),
      description: s(p,"description"),
      parent: extractStrongRef(j(p,"parent")),
      aliases: arr(p,"aliases"),
      externalReference: await resolveBlobsInValue(j(p,"externalReference"), row.did),
      deprecated: extractStrongRef(j(p,"deprecated")),
      createdAt: s(p,"createdAt"),
    },
  };
}

async function mapBoard(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      subject: extractStrongRef(j(p,"subject")),
      config: await resolveBlobsInValue(j(p,"config"), row.did),
      contributorConfigs: await resolveBlobsInValue(j(p,"contributorConfigs"), row.did),
      createdAt: s(p,"createdAt"),
    },
  };
}

async function mapDisplayProfile(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      displayName: s(p,"displayName"),
      image: await resolveBlobsInValue(j(p,"image"), row.did),
      video: await resolveBlobsInValue(j(p,"video"), row.did),
      hoverImage: await resolveBlobsInValue(j(p,"hoverImage"), row.did),
      hoverIframeUrl: s(p,"hoverIframeUrl"),
      url: s(p,"url"),
      createdAt: s(p,"createdAt"),
    },
  };
}

async function mapSaleEvent(row: RecordRow) {
  const p = payload(row);
  const buyerRaw = j(p, "buyer");
  const buyer = typeof buyerRaw === "string"
    ? buyerRaw
    : (buyerRaw != null && typeof buyerRaw === "object")
      ? (s(buyerRaw as Record<string, unknown>, "did") ?? null)
      : null;
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      activityClaimUri: s(p, "activityClaimUri"),
      buyer,
      amount:   s(p, "amount"),
      currency: s(p, "currency"),
      receipt:  s(p, "receipt"),
      createdAt: s(p, "createdAt"),
    },
  };
}

async function mapTransferEvent(row: RecordRow) {
  const p = payload(row);
  const fromRaw = j(p, "from");
  const from = typeof fromRaw === "string"
    ? fromRaw
    : (fromRaw != null && typeof fromRaw === "object")
      ? (s(fromRaw as Record<string, unknown>, "did") ?? null)
      : null;
  const toRaw = j(p, "to");
  const to = typeof toRaw === "string"
    ? toRaw
    : (toRaw != null && typeof toRaw === "object")
      ? (s(toRaw as Record<string, unknown>, "did") ?? null)
      : null;
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      activityClaimUri: s(p, "activityClaimUri"),
      from,
      to,
      amount:           s(p, "amount"),
      currency:         s(p, "currency"),
      signedAt:         s(p, "signedAt"),
      nonce:            s(p, "nonce"),
      chainId:          s(p, "chainId"),
      signerEVMAddress: s(p, "signerEVMAddress"),
      signature:        s(p, "signature"),
      createdAt:        s(p, "createdAt"),
    },
  };
}

async function mapListing(row: RecordRow) {
  const p = payload(row);
  const allowOversell = typeof p["allowOversell"] === "boolean" ? p["allowOversell"] : null;
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      goal:         s(p, "goal"),
      currency:     s(p, "currency"),
      allowOversell,
      status:       s(p, "status"),
      updatedAt:    s(p, "updatedAt"),
      createdAt:    s(p, "createdAt"),
    },
  };
}

// ── Context namespace objectType ──

builder.objectType(HcContextNS, {
  name: "HcContextNamespace",
  description: "Hypercerts context records (org.hypercerts.context.*).",
  fields: (t) => ({
    acknowledgement: t.field({
      type: HcAcknowledgementPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.context.acknowledgement", args, mapAcknowledgement),
    }),
    attachment: t.field({
      type: HcAttachmentPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;
        const page = await getRecordsByCollection("org.hypercerts.context.attachment", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        const data = await Promise.all(page.records.map(mapAttachment));
        return { data, pageInfo: toPageInfo(page.cursor, data.length) };
      },
    }),
    evaluation: t.field({
      type: HcEvaluationPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.context.evaluation", args, mapEvaluation),
    }),
    measurement: t.field({
      type: HcMeasurementPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.context.measurement", args, mapMeasurement),
    }),
  }),
});

// ── Workscope namespace objectType ──

builder.objectType(HcWorkscopeNS, {
  name: "HcWorkscopeNamespace",
  description: "Hypercerts work scope records (org.hypercerts.workscope.*).",
  fields: (t) => ({
    tag: t.field({
      type: HcWorkScopeTagPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;
        const page = await getRecordsByCollection("org.hypercerts.workscope.tag", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        const data = await Promise.all(page.records.map(mapWorkScopeTag));
        return { data, pageInfo: toPageInfo(page.cursor, data.length) };
      },
    }),
  }),
});

// ── Fraction namespace objectType ──

builder.objectType(HcFractionNS, {
  name: "HcFractionNamespace",
  description: "Hypercerts fraction records (org.hypercerts.fraction.*).",
  fields: (t) => ({
    saleEvent: t.field({
      type: HcSaleEventPageType,
      description: "Paginated list of org.hypercerts.fraction.saleEvent records.",
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.fraction.saleEvent", args, mapSaleEvent),
    }),
    transferEvent: t.field({
      type: HcTransferEventPageType,
      description: "Paginated list of org.hypercerts.fraction.transferEvent records.",
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.fraction.transferEvent", args, mapTransferEvent),
    }),
  }),
});

// ── Order namespace objectType ──

builder.objectType(HcOrderNS, {
  name: "HcOrderNamespace",
  description: "Hypercerts order records (org.hypercerts.order.*).",
  fields: (t) => ({
    listing: t.field({
      type: HcListingPageType,
      description: "Paginated list of org.hypercerts.order.listing records.",
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.order.listing", args, mapListing),
    }),
  }),
});

// ── Hyperboards namespace objectType ──

builder.objectType(HyperboardsNS, {
  name: "HyperboardsNamespace",
  description: "Hyperboards AT Protocol records (org.hyperboards.*).",
  fields: (t) => ({
    board: t.field({
      type: HbBoardPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;
        const page = await getRecordsByCollection("org.hyperboards.board", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        const data = await Promise.all(page.records.map(mapBoard));
        return { data, pageInfo: toPageInfo(page.cursor, data.length) };
      },
    }),
    displayProfile: t.field({
      type: HbDisplayProfilePageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;
        const page = await getRecordsByCollection("org.hyperboards.displayProfile", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        const data = await Promise.all(page.records.map(mapDisplayProfile));
        return { data, pageInfo: toPageInfo(page.cursor, data.length) };
      },
    }),
  }),
});

// ── Namespace objectType ──

builder.objectType(HypercertsNS, {
  name: "HypercertsNamespace",
  description: "Hypercerts AT Protocol records (org.hypercerts.*).",
  fields: (t) => ({
    activity: t.field({
      type: HcActivityPageType,
      description:
        "Paginated list of org.hypercerts.claim.activity records. " +
        "When `where` contains no text-filter fields, returns all records ordered by time (sortBy/order apply). " +
        "When `where` contains any of title/shortDescription/description/text, runs a text search " +
        "(sortBy/order are ignored; results ordered by indexed_at DESC). " +
        "Combine with `labelTier` to intersect label and text filters.",
      args: {
        cursor:    t.arg.string(),
        limit:     t.arg.int(),
        where:     t.arg({ type: ActivityWhereInputRef, required: false }),
        sortBy:    t.arg({ type: SortFieldEnum, description: "Sort field when no text filter is present." }),
        order:     t.arg({ type: SortOrderEnum, description: "Sort direction when no text filter is present." }),
        labelTier: t.arg.string({
          description: "Filter by Hyperlabel quality tier: high-quality | standard | draft | likely-test",
        }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order, labelTier } = args;

        // ── 1. Resolve actor to DID ──────────────────────────────
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;

        // ── 2. Optional labelTier pre-filter ────────────────────
        let allowedDids: Set<string> | null = null;
        if (labelTier) {
          allowedDids = await getActivityLabelDids(HYPERLABEL_DID, labelTier);
          if (resolvedDid) {
            if (allowedDids.has(resolvedDid)) {
              allowedDids = new Set([resolvedDid]);
            } else {
              return { data: [], pageInfo: { endCursor: null, hasNextPage: false, count: 0 } };
            }
          }
          if (allowedDids.size === 0) {
            return { data: [], pageInfo: { endCursor: null, hasNextPage: false, count: 0 } };
          }
        }

        // ── 3. Query records ─────────────────────────────────────
        const safeLimit = Math.min(Math.max(limit ?? 50, 1), 100);
        let rows;
        let pageCursor: string | undefined;

        if (activityWhereHasText(where)) {
          // Path a: text search
          const page = await searchActivities({
            filter: activityWhereToFilter(where as ActivityWhereInput),
            did:    allowedDids?.size === 1 ? [...allowedDids][0] : resolvedDid,
            limit:  safeLimit,
            cursor: cursor ?? undefined,
          });
          rows = allowedDids && allowedDids.size > 1
            ? page.records.filter((r) => allowedDids!.has(r.did))
            : page.records;
          pageCursor = page.cursor;
        } else {
          // Path b: plain list
          if (allowedDids !== null && allowedDids.size > 1) {
            const page = await getRecordsByCollection("org.hypercerts.claim.activity", {
              cursor: cursor ?? undefined, limit: safeLimit,
              sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
              sortOrder: (order  as "asc" | "desc")            ?? undefined,
            });
            rows = page.records.filter((r) => allowedDids!.has(r.did)).slice(0, safeLimit);
            pageCursor = page.cursor;
          } else {
            const singleDid = allowedDids?.size === 1 ? [...allowedDids][0] : resolvedDid;
            const page = await getRecordsByCollection("org.hypercerts.claim.activity", {
              cursor: cursor ?? undefined, limit: safeLimit, did: singleDid,
              sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
              sortOrder: (order  as "asc" | "desc")            ?? undefined,
            });
            rows = page.records;
            pageCursor = page.cursor;
          }
        }

        // ── 4. Attach labels ─────────────────────────────────────
        const authorDids = [...new Set(rows.map((r) => r.did))];
        await getPdsHostsBatch(authorDids);
        const labelMap = await getLabelsByDids(authorDids, HYPERLABEL_DID);
        const data = await Promise.all(rows.map((row) => {
          const lRow = labelMap.get(row.did) ?? null;
          const label = lRow ? {
            tier:      lRow.label_value,
            labeler:   lRow.source_did,
            labeledAt: lRow.labeled_at?.toISOString() ?? null,
            syncedAt:  lRow.synced_at.toISOString(),
          } : null;
          return mapActivity(row, label);
        }));

        // ── 5. Apply boolean where filters (post-fetch) ─────────
        // These are applied after mapping because they depend on resolved
        // data (image from JSONB payload, org name from creatorInfo cache).
        let filtered = data;
        if (where?.hasImage === true) {
          filtered = filtered.filter((item) => item.record.image != null);
        }
        if (where?.hasOrganizationInfoRecord === true) {
          filtered = filtered.filter((item) => item.creatorInfo.organizationName != null);
        }

        // ── 6. Fire-and-forget label refresh ────────────────────
        refreshLabelsAsync(authorDids);

        return { data: filtered, pageInfo: toPageInfo(pageCursor, filtered.length) };
      },
    }),
    collection: t.field({
      type: HcCollectionPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;
        const page = await getRecordsByCollection("org.hypercerts.collection", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        const data = await Promise.all(page.records.map(mapCollection));
        return { data, pageInfo: toPageInfo(page.cursor, data.length) };
      },
    }),
    rights: t.field({
      type: HcRightsPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.claim.rights", args, mapRights),
    }),
    fundingReceipt: t.field({
      type: HcFundingReceiptPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.funding.receipt", args, mapFundingReceipt),
    }),
    contribution: t.field({
      type: HcContributionPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("org.hypercerts.claim.contribution", args, mapContribution),
    }),
    contributorInformation: t.field({
      type: HcContributorInformationPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;
        const page = await getRecordsByCollection("org.hypercerts.claim.contributorInformation", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        const data = await Promise.all(page.records.map(mapContributorInformation));
        return { data, pageInfo: toPageInfo(page.cursor, data.length) };
      },
    }),
    context: t.field({
      type: HcContextNS,
      description: "Context records (org.hypercerts.context.*).",
      resolve: () => new HcContextNS(),
    }),
    workscope: t.field({
      type: HcWorkscopeNS,
      description: "Work scope records (org.hypercerts.workscope.*).",
      resolve: () => new HcWorkscopeNS(),
    }),
    fraction: t.field({
      type: HcFractionNS,
      description: "Fraction records (org.hypercerts.fraction.*).",
      resolve: () => new HcFractionNS(),
    }),
    order: t.field({
      type: HcOrderNS,
      description: "Order records (org.hypercerts.order.*).",
      resolve: () => new HcOrderNS(),
    }),
  }),
});

builder.queryFields((t) => ({
  hypercerts: t.field({
    type: HypercertsNS,
    description: "All Hypercerts indexed records, grouped by namespace.",
    resolve: () => new HypercertsNS(),
  }),
  hyperboards: t.field({
    type: HyperboardsNS,
    description: "All Hyperboards indexed records.",
    resolve: () => new HyperboardsNS(),
  }),
}));
