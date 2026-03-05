/**
 * GraphQL namespace: gainforest
 *
 * Every paginated query accepts:
 *   cursor  – opaque keyset pagination token
 *   limit   – page size 1-100 (default 50)
 *   where   – identity filter { did?, handle?, and?, or?, not? }
 *   sortBy  – CREATED_AT | INDEXED_AT
 *   order   – DESC (default) | ASC
 *
 * organization.info additionally accepts a richer OrgInfoWhereInput
 * with displayName / shortDescription / longDescription / text search fields.
 *
 * Every leaf returns:
 *   { data: [XxxItem!]!, pageInfo: { endCursor, hasNextPage, count } }
 *
 * Each item has:
 *   metadata   – AT Protocol envelope (uri, did, collection, rkey, cid, indexedAt, createdAt)
 *   creatorInfo – resolved org name + logo from gainforest.organization.info
 *   record      – pure lexicon payload fields
 */

import { builder } from "../builder.ts";
import {
  PageInfoType, RecordMetaType, BlobRefType, CreatorInfoType,
  SortOrderEnum, SortFieldEnum,
  rowToMeta, payload, extractBlobRef, fetchCollectionPage, toPageInfo,
  WhereInputRef, OrgInfoWhereInputRef, orgInfoWhereToFilter, orgInfoWhereHasText,
  resolveCreatorInfo,
} from "../types.ts";
import type { OrgInfoWhereInput } from "../types.ts";
import { getRecordsByCollection, searchOrganizations } from "@/db/queries.ts";
import { resolveActorToDid } from "../identity.ts";
import { getPdsHostsBatch } from "@/identity/pds.ts";
import type { RecordRow } from "@/db/types.ts";

// ================================================================
// JSONB field accessors
// ================================================================

const s = (p: Record<string, unknown>, k: string): string | null => {
  const v = p[k]; if (v == null) return null;
  return typeof v === "string" ? v : String(v);
};
const n = (p: Record<string, unknown>, k: string): number | null => {
  const v = p[k]; if (v == null) return null;
  if (typeof v === "number") return v;
  const x = Number(v); return isNaN(x) ? null : x;
};
const b = (p: Record<string, unknown>, k: string): boolean | null => {
  const v = p[k]; if (v == null) return null;
  return Boolean(v);
};
const arr = (p: Record<string, unknown>, k: string): string[] | null => {
  const v = p[k]; return Array.isArray(v) ? v.map(String) : null;
};
const j = (p: Record<string, unknown>, k: string): unknown => p[k] ?? null;

// ================================================================
// Token classes — one per namespace level
// ================================================================

class DwcNS {}
class EvaluatorNS {}
class OrgObservationsNS {}
class OrgPredictionsNS {}
class OrgRecordingsNS {}
class OrgNS {}
class GainforestNS {}

// ================================================================
// ── DWC pure record types ────────────────────────────────────────
// ================================================================

const DwcEventRecordType = builder.simpleObject("DwcEventRecord", {
  description: "Pure payload for a Darwin Core sampling event (app.gainforest.dwc.event).",
  fields: (t) => ({
    eventID:                       t.string({ nullable: true }),
    parentEventID:                 t.string({ nullable: true }),
    parentEventRef:                t.string({ nullable: true }),
    eventDate:                     t.string({ nullable: true }),
    eventTime:                     t.string({ nullable: true }),
    habitat:                       t.string({ nullable: true }),
    samplingProtocol:              t.string({ nullable: true }),
    sampleSizeValue:               t.string({ nullable: true }),
    sampleSizeUnit:                t.string({ nullable: true }),
    samplingEffort:                t.string({ nullable: true }),
    fieldNotes:                    t.string({ nullable: true }),
    eventRemarks:                  t.string({ nullable: true }),
    locationID:                    t.string({ nullable: true }),
    decimalLatitude:               t.string({ nullable: true }),
    decimalLongitude:              t.string({ nullable: true }),
    geodeticDatum:                 t.string({ nullable: true }),
    coordinateUncertaintyInMeters: t.int({ nullable: true }),
    country:                       t.string({ nullable: true }),
    countryCode:                   t.string({ nullable: true }),
    stateProvince:                 t.string({ nullable: true }),
    county:                        t.string({ nullable: true }),
    municipality:                  t.string({ nullable: true }),
    locality:                      t.string({ nullable: true }),
    minimumElevationInMeters:      t.int({ nullable: true }),
    maximumElevationInMeters:      t.int({ nullable: true }),
    locationRemarks:               t.string({ nullable: true }),
    createdAt:                     t.field({ type: "DateTime", nullable: true }),
  }),
});
const DwcEventItemType = builder.simpleObject("DwcEventItem", {
  description: "A Darwin Core sampling event (app.gainforest.dwc.event).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: DwcEventRecordType }),
  }),
});
const DwcEventPageType = builder.simpleObject("DwcEventPage", {
  fields: (t) => ({ data: t.field({ type: [DwcEventItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const DwcMeasurementRecordType = builder.simpleObject("DwcMeasurementRecord", {
  description: "Pure payload for a Darwin Core measurement (app.gainforest.dwc.measurement).",
  fields: (t) => ({
    measurementID:              t.string({ nullable: true }),
    occurrenceRef:              t.string({ nullable: true }),
    occurrenceID:               t.string({ nullable: true }),
    measurementType:            t.string({ nullable: true }),
    measurementValue:           t.string({ nullable: true }),
    measurementUnit:            t.string({ nullable: true }),
    measurementAccuracy:        t.string({ nullable: true }),
    measurementMethod:          t.string({ nullable: true }),
    measurementDeterminedBy:    t.string({ nullable: true }),
    measurementDeterminedDate:  t.string({ nullable: true }),
    measurementRemarks:         t.string({ nullable: true }),
    createdAt:                  t.field({ type: "DateTime", nullable: true }),
  }),
});
const DwcMeasurementItemType = builder.simpleObject("DwcMeasurementItem", {
  description: "A Darwin Core measurement (app.gainforest.dwc.measurement).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: DwcMeasurementRecordType }),
  }),
});
const DwcMeasurementPageType = builder.simpleObject("DwcMeasurementPage", {
  fields: (t) => ({ data: t.field({ type: [DwcMeasurementItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const DwcOccurrenceRecordType = builder.simpleObject("DwcOccurrenceRecord", {
  description: "Pure payload for a Darwin Core species occurrence (app.gainforest.dwc.occurrence).",
  fields: (t) => ({
    occurrenceID:                  t.string({ nullable: true }),
    basisOfRecord:                 t.string({ nullable: true }),
    dcType:                        t.string({ nullable: true }),
    license:                       t.string({ nullable: true }),
    rightsHolder:                  t.string({ nullable: true }),
    institutionCode:               t.string({ nullable: true }),
    collectionCode:                t.string({ nullable: true }),
    datasetName:                   t.string({ nullable: true }),
    informationWithheld:           t.string({ nullable: true }),
    dataGeneralizations:           t.string({ nullable: true }),
    references:                    t.string({ nullable: true }),
    recordedBy:                    t.string({ nullable: true }),
    recordedByID:                  t.string({ nullable: true }),
    individualCount:               t.int({ nullable: true }),
    organismQuantity:              t.string({ nullable: true }),
    organismQuantityType:          t.string({ nullable: true }),
    sex:                           t.string({ nullable: true }),
    lifeStage:                     t.string({ nullable: true }),
    reproductiveCondition:         t.string({ nullable: true }),
    behavior:                      t.string({ nullable: true }),
    occurrenceStatus:              t.string({ nullable: true }),
    occurrenceRemarks:             t.string({ nullable: true }),
    associatedMedia:               t.string({ nullable: true }),
    associatedReferences:          t.string({ nullable: true }),
    associatedSequences:           t.string({ nullable: true }),
    associatedOccurrences:         t.string({ nullable: true }),
    eventID:                       t.string({ nullable: true }),
    eventRef:                      t.string({ nullable: true }),
    eventDate:                     t.string({ nullable: true }),
    eventTime:                     t.string({ nullable: true }),
    habitat:                       t.string({ nullable: true }),
    samplingProtocol:              t.string({ nullable: true }),
    samplingEffort:                t.string({ nullable: true }),
    fieldNotes:                    t.string({ nullable: true }),
    locationID:                    t.string({ nullable: true }),
    decimalLatitude:               t.string({ nullable: true }),
    decimalLongitude:              t.string({ nullable: true }),
    geodeticDatum:                 t.string({ nullable: true }),
    coordinateUncertaintyInMeters: t.int({ nullable: true }),
    country:                       t.string({ nullable: true }),
    countryCode:                   t.string({ nullable: true }),
    stateProvince:                 t.string({ nullable: true }),
    county:                        t.string({ nullable: true }),
    municipality:                  t.string({ nullable: true }),
    locality:                      t.string({ nullable: true }),
    verbatimLocality:              t.string({ nullable: true }),
    minimumElevationInMeters:      t.int({ nullable: true }),
    maximumElevationInMeters:      t.int({ nullable: true }),
    minimumDepthInMeters:          t.int({ nullable: true }),
    maximumDepthInMeters:          t.int({ nullable: true }),
    locationRemarks:               t.string({ nullable: true }),
    gbifTaxonKey:                  t.string({ nullable: true }),
    scientificName:                t.string({ nullable: true }),
    scientificNameAuthorship:      t.string({ nullable: true }),
    kingdom:                       t.string({ nullable: true }),
    phylum:                        t.string({ nullable: true }),
    class:                         t.string({ nullable: true }),
    order:                         t.string({ nullable: true }),
    family:                        t.string({ nullable: true }),
    genus:                         t.string({ nullable: true }),
    specificEpithet:               t.string({ nullable: true }),
    infraspecificEpithet:          t.string({ nullable: true }),
    taxonRank:                     t.string({ nullable: true }),
    vernacularName:                t.string({ nullable: true }),
    taxonomicStatus:               t.string({ nullable: true }),
    nomenclaturalCode:             t.string({ nullable: true }),
    higherClassification:          t.string({ nullable: true }),
    identifiedBy:                  t.string({ nullable: true }),
    identifiedByID:                t.string({ nullable: true }),
    dateIdentified:                t.string({ nullable: true }),
    identificationQualifier:       t.string({ nullable: true }),
    identificationRemarks:         t.string({ nullable: true }),
    previousIdentifications:       t.string({ nullable: true }),
    dynamicProperties:             t.string({ nullable: true }),
    imageEvidence:                 t.field({ type: BlobRefType, nullable: true }),
    audioEvidence:                 t.field({ type: BlobRefType, nullable: true }),
    videoEvidence:                 t.field({ type: BlobRefType, nullable: true }),
    spectrogramEvidence:           t.field({ type: BlobRefType, nullable: true }),
    createdAt:                     t.field({ type: "DateTime", nullable: true }),
  }),
});
const DwcOccurrenceItemType = builder.simpleObject("DwcOccurrenceItem", {
  description: "A Darwin Core species occurrence (app.gainforest.dwc.occurrence).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: DwcOccurrenceRecordType }),
  }),
});
const DwcOccurrencePageType = builder.simpleObject("DwcOccurrencePage", {
  fields: (t) => ({ data: t.field({ type: [DwcOccurrenceItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── DWC mappers ──

async function mapDwcEvent(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      eventID: s(p,"eventID"), parentEventID: s(p,"parentEventID"),
      parentEventRef: s(p,"parentEventRef"), eventDate: s(p,"eventDate"),
      eventTime: s(p,"eventTime"), habitat: s(p,"habitat"),
      samplingProtocol: s(p,"samplingProtocol"), sampleSizeValue: s(p,"sampleSizeValue"),
      sampleSizeUnit: s(p,"sampleSizeUnit"), samplingEffort: s(p,"samplingEffort"),
      fieldNotes: s(p,"fieldNotes"), eventRemarks: s(p,"eventRemarks"),
      locationID: s(p,"locationID"), decimalLatitude: s(p,"decimalLatitude"),
      decimalLongitude: s(p,"decimalLongitude"), geodeticDatum: s(p,"geodeticDatum"),
      coordinateUncertaintyInMeters: n(p,"coordinateUncertaintyInMeters"),
      country: s(p,"country"), countryCode: s(p,"countryCode"),
      stateProvince: s(p,"stateProvince"), county: s(p,"county"),
      municipality: s(p,"municipality"), locality: s(p,"locality"),
      minimumElevationInMeters: n(p,"minimumElevationInMeters"),
      maximumElevationInMeters: n(p,"maximumElevationInMeters"),
      locationRemarks: s(p,"locationRemarks"), createdAt: s(p,"createdAt"),
    },
  };
}

async function mapDwcMeasurement(row: RecordRow) {
  const p = payload(row);
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      measurementID: s(p,"measurementID"), occurrenceRef: s(p,"occurrenceRef"),
      occurrenceID: s(p,"occurrenceID"), measurementType: s(p,"measurementType"),
      measurementValue: s(p,"measurementValue"), measurementUnit: s(p,"measurementUnit"),
      measurementAccuracy: s(p,"measurementAccuracy"), measurementMethod: s(p,"measurementMethod"),
      measurementDeterminedBy: s(p,"measurementDeterminedBy"),
      measurementDeterminedDate: s(p,"measurementDeterminedDate"),
      measurementRemarks: s(p,"measurementRemarks"), createdAt: s(p,"createdAt"),
    },
  };
}

async function mapDwcOccurrence(row: RecordRow) {
  const p = payload(row);
  const { did } = row;
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(did),
    record: {
      occurrenceID: s(p,"occurrenceID"), basisOfRecord: s(p,"basisOfRecord"),
      dcType: s(p,"dcType"), license: s(p,"license"), rightsHolder: s(p,"rightsHolder"),
      institutionCode: s(p,"institutionCode"), collectionCode: s(p,"collectionCode"),
      datasetName: s(p,"datasetName"), informationWithheld: s(p,"informationWithheld"),
      dataGeneralizations: s(p,"dataGeneralizations"), references: s(p,"references"),
      recordedBy: s(p,"recordedBy"), recordedByID: s(p,"recordedByID"),
      individualCount: n(p,"individualCount"), organismQuantity: s(p,"organismQuantity"),
      organismQuantityType: s(p,"organismQuantityType"), sex: s(p,"sex"),
      lifeStage: s(p,"lifeStage"), reproductiveCondition: s(p,"reproductiveCondition"),
      behavior: s(p,"behavior"), occurrenceStatus: s(p,"occurrenceStatus"),
      occurrenceRemarks: s(p,"occurrenceRemarks"), associatedMedia: s(p,"associatedMedia"),
      associatedReferences: s(p,"associatedReferences"),
      associatedSequences: s(p,"associatedSequences"),
      associatedOccurrences: s(p,"associatedOccurrences"),
      eventID: s(p,"eventID"), eventRef: s(p,"eventRef"),
      eventDate: s(p,"eventDate"), eventTime: s(p,"eventTime"),
      habitat: s(p,"habitat"), samplingProtocol: s(p,"samplingProtocol"),
      samplingEffort: s(p,"samplingEffort"), fieldNotes: s(p,"fieldNotes"),
      locationID: s(p,"locationID"),
      decimalLatitude: s(p,"decimalLatitude"), decimalLongitude: s(p,"decimalLongitude"),
      geodeticDatum: s(p,"geodeticDatum"),
      coordinateUncertaintyInMeters: n(p,"coordinateUncertaintyInMeters"),
      country: s(p,"country"), countryCode: s(p,"countryCode"),
      stateProvince: s(p,"stateProvince"), county: s(p,"county"),
      municipality: s(p,"municipality"), locality: s(p,"locality"),
      verbatimLocality: s(p,"verbatimLocality"),
      minimumElevationInMeters: n(p,"minimumElevationInMeters"),
      maximumElevationInMeters: n(p,"maximumElevationInMeters"),
      minimumDepthInMeters: n(p,"minimumDepthInMeters"),
      maximumDepthInMeters: n(p,"maximumDepthInMeters"),
      locationRemarks: s(p,"locationRemarks"),
      gbifTaxonKey: s(p,"gbifTaxonKey"), scientificName: s(p,"scientificName"),
      scientificNameAuthorship: s(p,"scientificNameAuthorship"),
      kingdom: s(p,"kingdom"), phylum: s(p,"phylum"), class: s(p,"class"),
      order: s(p,"order"), family: s(p,"family"), genus: s(p,"genus"),
      specificEpithet: s(p,"specificEpithet"), infraspecificEpithet: s(p,"infraspecificEpithet"),
      taxonRank: s(p,"taxonRank"), vernacularName: s(p,"vernacularName"),
      taxonomicStatus: s(p,"taxonomicStatus"), nomenclaturalCode: s(p,"nomenclaturalCode"),
      higherClassification: s(p,"higherClassification"),
      identifiedBy: s(p,"identifiedBy"), identifiedByID: s(p,"identifiedByID"),
      dateIdentified: s(p,"dateIdentified"),
      identificationQualifier: s(p,"identificationQualifier"),
      identificationRemarks: s(p,"identificationRemarks"),
      previousIdentifications: s(p,"previousIdentifications"),
      dynamicProperties: s(p,"dynamicProperties"),
      imageEvidence:       await extractBlobRef(j(p,"imageEvidence"),       did),
      audioEvidence:       await extractBlobRef(j(p,"audioEvidence"),       did),
      videoEvidence:       await extractBlobRef(j(p,"videoEvidence"),       did),
      spectrogramEvidence: await extractBlobRef(j(p,"spectrogramEvidence"), did),
      createdAt: s(p,"createdAt"),
    },
  };
}

// ── DWC namespace ──
builder.objectType(DwcNS, {
  name: "DwcNamespace",
  description: "Darwin Core biodiversity records (app.gainforest.dwc.*).",
  fields: (t) => ({
    event: t.field({
      type: DwcEventPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.gainforest.dwc.event", args, mapDwcEvent),
    }),
    measurement: t.field({
      type: DwcMeasurementPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.gainforest.dwc.measurement", args, mapDwcMeasurement),
    }),
    occurrence: t.field({
      type: DwcOccurrencePageType,
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
        const page = await getRecordsByCollection("app.gainforest.dwc.occurrence", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        const data = await Promise.all(page.records.map(mapDwcOccurrence));
        return { data, pageInfo: toPageInfo(page.cursor, data.length) };
      },
    }),
  }),
});

// ================================================================
// ── EVALUATOR pure record types ──────────────────────────────────
// ================================================================

const EvaluationRecordType = builder.simpleObject("EvaluationRecord", {
  description: "Pure payload for an evaluator evaluation (app.gainforest.evaluator.evaluation).",
  fields: (t) => ({
    subject:           t.field({ type: "JSON", nullable: true }),
    subjects:          t.field({ type: "JSON", nullable: true }),
    evaluationType:    t.string({ nullable: true }),
    result:            t.field({ type: "JSON", nullable: true }),
    confidence:        t.int({ nullable: true }),
    method:            t.field({ type: "JSON", nullable: true }),
    neg:               t.boolean({ nullable: true }),
    supersedes:        t.string({ nullable: true }),
    dynamicProperties: t.string({ nullable: true }),
    createdAt:         t.field({ type: "DateTime", nullable: true }),
  }),
});
const EvaluationItemType = builder.simpleObject("EvaluationItem", {
  description: "An evaluator evaluation (app.gainforest.evaluator.evaluation).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: EvaluationRecordType }),
  }),
});
const EvaluationPageType = builder.simpleObject("EvaluationPage", {
  fields: (t) => ({ data: t.field({ type: [EvaluationItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const EvaluatorServiceRecordType = builder.simpleObject("EvaluatorServiceRecord", {
  description: "Pure payload for an evaluator service (app.gainforest.evaluator.service).",
  fields: (t) => ({
    policies:  t.field({ type: "JSON", nullable: true }),
    createdAt: t.field({ type: "DateTime", nullable: true }),
  }),
});
const EvaluatorServiceItemType = builder.simpleObject("EvaluatorServiceItem", {
  description: "An evaluator service (app.gainforest.evaluator.service).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: EvaluatorServiceRecordType }),
  }),
});
const EvaluatorServicePageType = builder.simpleObject("EvaluatorServicePage", {
  fields: (t) => ({ data: t.field({ type: [EvaluatorServiceItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const EvaluatorSubscriptionRecordType = builder.simpleObject("EvaluatorSubscriptionRecord", {
  description: "Pure payload for an evaluator subscription (app.gainforest.evaluator.subscription).",
  fields: (t) => ({
    evaluator:       t.string({ nullable: true }),
    collections:     t.stringList({ nullable: true }),
    evaluationTypes: t.stringList({ nullable: true }),
    createdAt:       t.field({ type: "DateTime", nullable: true }),
  }),
});
const EvaluatorSubscriptionItemType = builder.simpleObject("EvaluatorSubscriptionItem", {
  description: "An evaluator subscription (app.gainforest.evaluator.subscription).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: EvaluatorSubscriptionRecordType }),
  }),
});
const EvaluatorSubscriptionPageType = builder.simpleObject("EvaluatorSubscriptionPage", {
  fields: (t) => ({ data: t.field({ type: [EvaluatorSubscriptionItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

builder.objectType(EvaluatorNS, {
  name: "EvaluatorNamespace",
  description: "Evaluator records (app.gainforest.evaluator.*).",
  fields: (t) => ({
    evaluation: t.field({
      type: EvaluationPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.gainforest.evaluator.evaluation", args, async (row) => {
        const p = payload(row);
        return {
          metadata:    rowToMeta(row),
          creatorInfo: await resolveCreatorInfo(row.did),
          record: {
            subject: j(p,"subject"), subjects: j(p,"subjects"),
            evaluationType: s(p,"evaluationType"), result: j(p,"result"),
            confidence: n(p,"confidence"), method: j(p,"method"),
            neg: b(p,"neg"), supersedes: s(p,"supersedes"),
            dynamicProperties: s(p,"dynamicProperties"), createdAt: s(p,"createdAt"),
          },
        };
      }),
    }),
    service: t.field({
      type: EvaluatorServicePageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.gainforest.evaluator.service", args, async (row) => {
        const p = payload(row);
        return {
          metadata:    rowToMeta(row),
          creatorInfo: await resolveCreatorInfo(row.did),
          record: { policies: j(p,"policies"), createdAt: s(p,"createdAt") },
        };
      }),
    }),
    subscription: t.field({
      type: EvaluatorSubscriptionPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.gainforest.evaluator.subscription", args, async (row) => {
        const p = payload(row);
        return {
          metadata:    rowToMeta(row),
          creatorInfo: await resolveCreatorInfo(row.did),
          record: {
            evaluator: s(p,"evaluator"),
            collections: arr(p,"collections"), evaluationTypes: arr(p,"evaluationTypes"),
            createdAt: s(p,"createdAt"),
          },
        };
      }),
    }),
  }),
});

// ================================================================
// ── ORGANIZATION pure record types ───────────────────────────────
// ================================================================

const OrgInfoRecordType = builder.simpleObject("OrgInfoRecord", {
  description: "Pure payload for an organization profile (app.gainforest.organization.info).",
  fields: (t) => ({
    displayName:      t.string({ nullable: true }),
    shortDescription: t.field({ type: "JSON", nullable: true }),
    longDescription:  t.field({ type: "JSON", nullable: true }),
    coverImage:       t.field({ type: BlobRefType, nullable: true }),
    logo:             t.field({ type: BlobRefType, nullable: true }),
    objectives:       t.stringList({ nullable: true }),
    country:          t.string({ nullable: true }),
    website:          t.string({ nullable: true }),
    visibility:       t.string({ nullable: true }),
    startDate:        t.field({ type: "DateTime", nullable: true }),
    createdAt:        t.field({ type: "DateTime", nullable: true }),
  }),
});
const OrgInfoItemType = builder.simpleObject("OrgInfoItem", {
  description: "An organization profile (app.gainforest.organization.info).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: OrgInfoRecordType }),
  }),
});
const OrgInfoPageType = builder.simpleObject("OrgInfoPage", {
  fields: (t) => ({ data: t.field({ type: [OrgInfoItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const OrgLayerRecordType = builder.simpleObject("OrgLayerRecord", {
  description: "Pure payload for a geospatial map layer (app.gainforest.organization.layer).",
  fields: (t) => ({
    name:        t.string({ nullable: true }),
    type:        t.string({ nullable: true }),
    uri:         t.string({ nullable: true }),
    description: t.string({ nullable: true }),
    createdAt:   t.field({ type: "DateTime", nullable: true }),
  }),
});
const OrgLayerItemType = builder.simpleObject("OrgLayerItem", {
  description: "A geospatial map layer (app.gainforest.organization.layer).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: OrgLayerRecordType }),
  }),
});
const OrgLayerPageType = builder.simpleObject("OrgLayerPage", {
  fields: (t) => ({ data: t.field({ type: [OrgLayerItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const OrgDefaultSiteRecordType = builder.simpleObject("OrgDefaultSiteRecord", {
  description: "Pure payload for a default site declaration (app.gainforest.organization.defaultSite).",
  fields: (t) => ({
    site:      t.string({ nullable: true }),
    createdAt: t.field({ type: "DateTime", nullable: true }),
  }),
});
const OrgDefaultSiteItemType = builder.simpleObject("OrgDefaultSiteItem", {
  description: "Default site declaration (app.gainforest.organization.defaultSite).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: OrgDefaultSiteRecordType }),
  }),
});
const OrgDefaultSitePageType = builder.simpleObject("OrgDefaultSitePage", {
  fields: (t) => ({ data: t.field({ type: [OrgDefaultSiteItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const OrgFaunaObsRecordType = builder.simpleObject("OrgFaunaObservationRecord", {
  fields: (t) => ({
    gbifTaxonKeys: t.stringList({ nullable: true }),
    createdAt:     t.field({ type: "DateTime", nullable: true }),
  }),
});
const OrgFaunaObsItemType = builder.simpleObject("OrgFaunaObservationItem", {
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: OrgFaunaObsRecordType }),
  }),
});
const OrgFaunaObsPageType = builder.simpleObject("OrgFaunaObservationPage", {
  fields: (t) => ({ data: t.field({ type: [OrgFaunaObsItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const OrgFloraObsRecordType = builder.simpleObject("OrgFloraObservationRecord", {
  fields: (t) => ({
    gbifTaxonKeys: t.stringList({ nullable: true }),
    createdAt:     t.field({ type: "DateTime", nullable: true }),
  }),
});
const OrgFloraObsItemType = builder.simpleObject("OrgFloraObservationItem", {
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: OrgFloraObsRecordType }),
  }),
});
const OrgFloraObsPageType = builder.simpleObject("OrgFloraObservationPage", {
  fields: (t) => ({ data: t.field({ type: [OrgFloraObsItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const OrgDendogramRecordType = builder.simpleObject("OrgDendogramRecord", {
  description: "Pure payload for a dendogram observation (app.gainforest.organization.observations.dendogram).",
  fields: (t) => ({
    dendogram: t.field({ type: BlobRefType, nullable: true }),
    createdAt: t.field({ type: "DateTime", nullable: true }),
  }),
});
const OrgDendogramItemType = builder.simpleObject("OrgDendogramItem", {
  description: "A dendogram observation (app.gainforest.organization.observations.dendogram).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: OrgDendogramRecordType }),
  }),
});
const OrgDendogramPageType = builder.simpleObject("OrgDendogramPage", {
  fields: (t) => ({ data: t.field({ type: [OrgDendogramItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const OrgMeasuredTreesClusterRecordType = builder.simpleObject("OrgMeasuredTreesClusterRecord", {
  description: "Pure payload for a measured trees cluster (app.gainforest.organization.observations.measuredTreesCluster).",
  fields: (t) => ({
    shapefile: t.field({ type: BlobRefType, nullable: true }),
    createdAt: t.field({ type: "DateTime", nullable: true }),
  }),
});
const OrgMeasuredTreesClusterItemType = builder.simpleObject("OrgMeasuredTreesClusterItem", {
  description: "A measured trees cluster (app.gainforest.organization.observations.measuredTreesCluster).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: OrgMeasuredTreesClusterRecordType }),
  }),
});
const OrgMeasuredTreesClusterPageType = builder.simpleObject("OrgMeasuredTreesClusterPage", {
  fields: (t) => ({ data: t.field({ type: [OrgMeasuredTreesClusterItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const OrgFaunaPredRecordType = builder.simpleObject("OrgFaunaPredictionRecord", {
  fields: (t) => ({
    gbifTaxonKeys: t.stringList({ nullable: true }),
    createdAt:     t.field({ type: "DateTime", nullable: true }),
  }),
});
const OrgFaunaPredItemType = builder.simpleObject("OrgFaunaPredictionItem", {
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: OrgFaunaPredRecordType }),
  }),
});
const OrgFaunaPredPageType = builder.simpleObject("OrgFaunaPredictionPage", {
  fields: (t) => ({ data: t.field({ type: [OrgFaunaPredItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const OrgFloraPredRecordType = builder.simpleObject("OrgFloraPredictionRecord", {
  fields: (t) => ({
    gbifTaxonKeys: t.stringList({ nullable: true }),
    createdAt:     t.field({ type: "DateTime", nullable: true }),
  }),
});
const OrgFloraPredItemType = builder.simpleObject("OrgFloraPredictionItem", {
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: OrgFloraPredRecordType }),
  }),
});
const OrgFloraPredPageType = builder.simpleObject("OrgFloraPredictionPage", {
  fields: (t) => ({ data: t.field({ type: [OrgFloraPredItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const OrgAudioMetadataType = builder.simpleObject("OrgAudioMetadata", {
  description: "Metadata for an audio recording.",
  fields: (t) => ({
    codec:       t.string({ nullable: true }),
    channels:    t.int({ nullable: true }),
    duration:    t.string({ nullable: true }),
    recordedAt:  t.field({ type: "DateTime", nullable: true }),
    sampleRate:  t.int({ nullable: true }),
    coordinates: t.string({ nullable: true }),
  }),
});
const OrgAudioRecordType = builder.simpleObject("OrgAudioRecord", {
  description: "Pure payload for an audio recording (app.gainforest.organization.recordings.audio).",
  fields: (t) => ({
    name:        t.string({ nullable: true }),
    description: t.field({ type: "JSON", nullable: true }),
    blob:        t.field({ type: BlobRefType, nullable: true }),
    metadata:    t.field({ type: OrgAudioMetadataType, nullable: true }),
    createdAt:   t.field({ type: "DateTime", nullable: true }),
  }),
});
const OrgAudioItemType = builder.simpleObject("OrgAudioItem", {
  description: "An audio recording (app.gainforest.organization.recordings.audio).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: OrgAudioRecordType }),
  }),
});
const OrgAudioPageType = builder.simpleObject("OrgAudioPage", {
  fields: (t) => ({ data: t.field({ type: [OrgAudioItemType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── Sub-namespace objectTypes ──

builder.objectType(OrgObservationsNS, {
  name: "OrgObservationsNamespace",
  fields: (t) => ({
    fauna: t.field({
      type: OrgFaunaObsPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.gainforest.organization.observations.fauna", args, async (row) => ({
        metadata:    rowToMeta(row),
        creatorInfo: await resolveCreatorInfo(row.did),
        record: { gbifTaxonKeys: arr(payload(row),"gbifTaxonKeys"), createdAt: s(payload(row),"createdAt") },
      })),
    }),
    flora: t.field({
      type: OrgFloraObsPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.gainforest.organization.observations.flora", args, async (row) => ({
        metadata:    rowToMeta(row),
        creatorInfo: await resolveCreatorInfo(row.did),
        record: { gbifTaxonKeys: arr(payload(row),"gbifTaxonKeys"), createdAt: s(payload(row),"createdAt") },
      })),
    }),
    dendogram: t.field({
      type: OrgDendogramPageType,
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
        const page = await getRecordsByCollection("app.gainforest.organization.observations.dendogram", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        const data = await Promise.all(page.records.map(async (row) => {
          const p = payload(row);
          return {
            metadata:    rowToMeta(row),
            creatorInfo: await resolveCreatorInfo(row.did),
            record: { dendogram: await extractBlobRef(j(p,"dendogram"), row.did), createdAt: s(p,"createdAt") },
          };
        }));
        return { data, pageInfo: toPageInfo(page.cursor, data.length) };
      },
    }),
    measuredTreesCluster: t.field({
      type: OrgMeasuredTreesClusterPageType,
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
        const page = await getRecordsByCollection("app.gainforest.organization.observations.measuredTreesCluster", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        const data = await Promise.all(page.records.map(async (row) => {
          const p = payload(row);
          return {
            metadata:    rowToMeta(row),
            creatorInfo: await resolveCreatorInfo(row.did),
            record: { shapefile: await extractBlobRef(j(p,"shapefile"), row.did), createdAt: s(p,"createdAt") },
          };
        }));
        return { data, pageInfo: toPageInfo(page.cursor, data.length) };
      },
    }),
  }),
});

builder.objectType(OrgPredictionsNS, {
  name: "OrgPredictionsNamespace",
  fields: (t) => ({
    fauna: t.field({
      type: OrgFaunaPredPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.gainforest.organization.predictions.fauna", args, async (row) => ({
        metadata:    rowToMeta(row),
        creatorInfo: await resolveCreatorInfo(row.did),
        record: { gbifTaxonKeys: arr(payload(row),"gbifTaxonKeys"), createdAt: s(payload(row),"createdAt") },
      })),
    }),
    flora: t.field({
      type: OrgFloraPredPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.gainforest.organization.predictions.flora", args, async (row) => ({
        metadata:    rowToMeta(row),
        creatorInfo: await resolveCreatorInfo(row.did),
        record: { gbifTaxonKeys: arr(payload(row),"gbifTaxonKeys"), createdAt: s(payload(row),"createdAt") },
      })),
    }),
  }),
});

builder.objectType(OrgRecordingsNS, {
  name: "OrgRecordingsNamespace",
  fields: (t) => ({
    audio: t.field({
      type: OrgAudioPageType,
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
        const page = await getRecordsByCollection("app.gainforest.organization.recordings.audio", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        const data = await Promise.all(page.records.map(async (row) => {
          const p = payload(row);
          const meta_raw = j(p,"metadata");
          let audioMeta: {
            codec: string | null; channels: number | null; duration: string | null;
            recordedAt: string | null; sampleRate: number | null; coordinates: string | null;
          } | null = null;
          if (meta_raw != null && typeof meta_raw === "object") {
            const m = meta_raw as Record<string, unknown>;
            audioMeta = {
              codec: s(m,"codec"), channels: n(m,"channels"),
              duration: s(m,"duration"), recordedAt: s(m,"recordedAt"),
              sampleRate: n(m,"sampleRate"), coordinates: s(m,"coordinates"),
            };
          }
          return {
            metadata:    rowToMeta(row),
            creatorInfo: await resolveCreatorInfo(row.did),
            record: {
              name: s(p,"name"),
              description: j(p,"description"),
              blob: await extractBlobRef(j(p,"blob"), row.did),
              metadata: audioMeta,
              createdAt: s(p,"createdAt"),
            },
          };
        }));
        return { data, pageInfo: toPageInfo(page.cursor, data.length) };
      },
    }),
  }),
});

builder.objectType(OrgNS, {
  name: "OrgNamespace",
  description: "Organization records (app.gainforest.organization.*).",
  fields: (t) => ({
    info: t.field({
      type: OrgInfoPageType,
      description:
        "Paginated list of app.gainforest.organization.info records. " +
        "When `where` contains no text-filter fields (displayName/shortDescription/longDescription/text), " +
        "returns all records ordered by time (sortBy/order apply). " +
        "When any text field is present in `where`, runs a text search (sortBy/order are ignored; " +
        "results ordered by indexed_at DESC).",
      args: {
        cursor: t.arg.string(),
        limit:  t.arg.int(),
        where:  t.arg({ type: OrgInfoWhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum, description: "Sort field when no text filter is present." }),
        order:  t.arg({ type: SortOrderEnum, description: "Sort direction when no text filter is present." }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;

        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;

        const page = orgInfoWhereHasText(where)
          ? await searchOrganizations({
              filter: orgInfoWhereToFilter(where as OrgInfoWhereInput),
              did:    resolvedDid,
              limit:  limit ?? undefined,
              cursor: cursor ?? undefined,
            })
          : await getRecordsByCollection("app.gainforest.organization.info", {
              cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
              sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
              sortOrder: (order  as "asc" | "desc")            ?? undefined,
            });

        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);

        const data = await Promise.all(page.records.map(async (row) => {
          const p = payload(row);
          return {
            metadata:    rowToMeta(row),
            creatorInfo: await resolveCreatorInfo(row.did),
            record: {
              displayName: s(p,"displayName"),
              shortDescription: j(p,"shortDescription"), longDescription: j(p,"longDescription"),
              coverImage: await extractBlobRef(j(p,"coverImage"), row.did),
              logo:       await extractBlobRef(j(p,"logo"),       row.did),
              objectives: arr(p,"objectives"),
              country: s(p,"country"), website: s(p,"website"),
              visibility: s(p,"visibility"), startDate: s(p,"startDate"),
              createdAt: s(p,"createdAt"),
            },
          };
        }));

        return { data, pageInfo: toPageInfo(page.cursor, data.length) };
      },
    }),
    layer: t.field({
      type: OrgLayerPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.gainforest.organization.layer", args, async (row) => {
        const p = payload(row);
        return {
          metadata:    rowToMeta(row),
          creatorInfo: await resolveCreatorInfo(row.did),
          record: {
            name: s(p,"name"), type: s(p,"type"), uri: s(p,"uri"),
            description: s(p,"description"), createdAt: s(p,"createdAt"),
          },
        };
      }),
    }),
    defaultSite: t.field({
      type: OrgDefaultSitePageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.gainforest.organization.defaultSite", args, async (row) => {
        const p = payload(row);
        return {
          metadata:    rowToMeta(row),
          creatorInfo: await resolveCreatorInfo(row.did),
          record: { site: s(p,"site"), createdAt: s(p,"createdAt") },
        };
      }),
    }),
    observations: t.field({ type: OrgObservationsNS, resolve: () => new OrgObservationsNS() }),
    predictions:  t.field({ type: OrgPredictionsNS,  resolve: () => new OrgPredictionsNS() }),
    recordings:   t.field({ type: OrgRecordingsNS,   resolve: () => new OrgRecordingsNS() }),
  }),
});

// ── GainForest root ──
builder.objectType(GainforestNS, {
  name: "GainforestNamespace",
  description: "All GainForest AT Protocol records.",
  fields: (t) => ({
    dwc:          t.field({ type: DwcNS,       resolve: () => new DwcNS() }),
    evaluator:    t.field({ type: EvaluatorNS, resolve: () => new EvaluatorNS() }),
    organization: t.field({ type: OrgNS,       resolve: () => new OrgNS() }),
  }),
});

builder.queryFields((t) => ({
  gainforest: t.field({
    type: GainforestNS,
    description: "All GainForest indexed records, grouped by namespace.",
    resolve: () => new GainforestNS(),
  }),
}));
