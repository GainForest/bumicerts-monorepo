/**
 * Custom resolver: app.gainforest.dwc.occurrence
 *
 * Excluded from auto-generation because the evidence blob fields
 * (imageEvidence, audioEvidence, videoEvidence, spectrogramEvidence) use
 * extractBlobRef → typed BlobRefType rather than resolveBlobsInValue → JSON.
 * This gives richer strongly-typed GraphQL fields for each evidence type.
 *
 * Attaches the `occurrence` field to the generated GainforestDwcNS.
 */

import { builder } from "../../builder.ts";
import {
  PageInfoType, RecordMetaType, BlobRefType, CreatorInfoType,
  SortOrderEnum, SortFieldEnum,
  WhereInputRef,
  rowToMeta, payload, extractBlobRef, resolveCreatorInfo, fetchCollectionPage,
} from "../../types.ts";
import { getPdsHostsBatch } from "@/identity/pds.ts";
import type { RecordRow } from "@/db/types.ts";

import { GainforestDwcNS } from "../generated.ts";

// JSONB accessors
const s = (p: Record<string, unknown>, k: string): string | null => {
  const v = p[k]; if (v == null) return null;
  return typeof v === "string" ? v : String(v);
};
const n = (p: Record<string, unknown>, k: string): number | null => {
  const v = p[k]; if (v == null) return null;
  if (typeof v === "number") return v;
  const x = Number(v); return isNaN(x) ? null : x;
};
const j = (p: Record<string, unknown>, k: string): unknown => p[k] ?? null;

// ── Pure record type ─────────────────────────────────────────────────────────

export const GainforestDwcOccurrenceRecordType = builder.simpleObject("GainforestDwcOccurrenceRecord", {
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
    establishmentMeans:            t.string({ nullable: true }),
    datasetRef:                    t.string({ nullable: true }),
    // Typed BlobRefType — richer than JSON, lets clients read uri/cid/mimeType/size directly
    imageEvidence:                 t.field({ type: BlobRefType, nullable: true }),
    audioEvidence:                 t.field({ type: BlobRefType, nullable: true }),
    videoEvidence:                 t.field({ type: BlobRefType, nullable: true }),
    spectrogramEvidence:           t.field({ type: BlobRefType, nullable: true }),
    createdAt:                     t.field({ type: "DateTime", nullable: true }),
  }),
});

// ── Item + Page types ────────────────────────────────────────────────────────

export const GainforestDwcOccurrenceItemType = builder.simpleObject("GainforestDwcOccurrenceItem", {
  description: "A Darwin Core species occurrence (app.gainforest.dwc.occurrence).",
  fields: (t) => ({
    metadata:    t.field({ type: RecordMetaType }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: GainforestDwcOccurrenceRecordType }),
  }),
});

export const GainforestDwcOccurrencePageType = builder.simpleObject("GainforestDwcOccurrencePage", {
  fields: (t) => ({
    data:     t.field({ type: [GainforestDwcOccurrenceItemType] }),
    pageInfo: t.field({ type: PageInfoType }),
  }),
});

// ── Row mapper ───────────────────────────────────────────────────────────────

export async function mapGainforestDwcOccurrence(row: RecordRow) {
  const p = payload(row);
  const { did } = row;
  return {
    metadata:    rowToMeta(row),
    creatorInfo: await resolveCreatorInfo(did),
    record: {
      occurrenceID: s(p, "occurrenceID"), basisOfRecord: s(p, "basisOfRecord"),
      dcType: s(p, "dcType"), license: s(p, "license"), rightsHolder: s(p, "rightsHolder"),
      institutionCode: s(p, "institutionCode"), collectionCode: s(p, "collectionCode"),
      datasetName: s(p, "datasetName"), informationWithheld: s(p, "informationWithheld"),
      dataGeneralizations: s(p, "dataGeneralizations"), references: s(p, "references"),
      recordedBy: s(p, "recordedBy"), recordedByID: s(p, "recordedByID"),
      individualCount: n(p, "individualCount"), organismQuantity: s(p, "organismQuantity"),
      organismQuantityType: s(p, "organismQuantityType"), sex: s(p, "sex"),
      lifeStage: s(p, "lifeStage"), reproductiveCondition: s(p, "reproductiveCondition"),
      behavior: s(p, "behavior"), occurrenceStatus: s(p, "occurrenceStatus"),
      occurrenceRemarks: s(p, "occurrenceRemarks"), associatedMedia: s(p, "associatedMedia"),
      associatedReferences: s(p, "associatedReferences"),
      associatedSequences: s(p, "associatedSequences"),
      associatedOccurrences: s(p, "associatedOccurrences"),
      eventID: s(p, "eventID"), eventRef: s(p, "eventRef"),
      eventDate: s(p, "eventDate"), eventTime: s(p, "eventTime"),
      habitat: s(p, "habitat"), samplingProtocol: s(p, "samplingProtocol"),
      samplingEffort: s(p, "samplingEffort"), fieldNotes: s(p, "fieldNotes"),
      locationID: s(p, "locationID"),
      decimalLatitude: s(p, "decimalLatitude"), decimalLongitude: s(p, "decimalLongitude"),
      geodeticDatum: s(p, "geodeticDatum"),
      coordinateUncertaintyInMeters: n(p, "coordinateUncertaintyInMeters"),
      country: s(p, "country"), countryCode: s(p, "countryCode"),
      stateProvince: s(p, "stateProvince"), county: s(p, "county"),
      municipality: s(p, "municipality"), locality: s(p, "locality"),
      verbatimLocality: s(p, "verbatimLocality"),
      minimumElevationInMeters: n(p, "minimumElevationInMeters"),
      maximumElevationInMeters: n(p, "maximumElevationInMeters"),
      minimumDepthInMeters: n(p, "minimumDepthInMeters"),
      maximumDepthInMeters: n(p, "maximumDepthInMeters"),
      locationRemarks: s(p, "locationRemarks"),
      gbifTaxonKey: s(p, "gbifTaxonKey"), scientificName: s(p, "scientificName"),
      scientificNameAuthorship: s(p, "scientificNameAuthorship"),
      kingdom: s(p, "kingdom"), phylum: s(p, "phylum"), class: s(p, "class"),
      order: s(p, "order"), family: s(p, "family"), genus: s(p, "genus"),
      specificEpithet: s(p, "specificEpithet"), infraspecificEpithet: s(p, "infraspecificEpithet"),
      taxonRank: s(p, "taxonRank"), vernacularName: s(p, "vernacularName"),
      taxonomicStatus: s(p, "taxonomicStatus"), nomenclaturalCode: s(p, "nomenclaturalCode"),
      higherClassification: s(p, "higherClassification"),
      identifiedBy: s(p, "identifiedBy"), identifiedByID: s(p, "identifiedByID"),
      dateIdentified: s(p, "dateIdentified"),
      identificationQualifier: s(p, "identificationQualifier"),
      identificationRemarks: s(p, "identificationRemarks"),
      previousIdentifications: s(p, "previousIdentifications"),
      dynamicProperties: s(p, "dynamicProperties"),
      establishmentMeans: s(p, "establishmentMeans"),
      datasetRef: s(p, "datasetRef"),
      // Typed blob resolution via extractBlobRef (→ BlobRefType)
      imageEvidence:       await extractBlobRef(j(p, "imageEvidence"),       did),
      audioEvidence:       await extractBlobRef(j(p, "audioEvidence"),       did),
      videoEvidence:       await extractBlobRef(j(p, "videoEvidence"),       did),
      spectrogramEvidence: await extractBlobRef(j(p, "spectrogramEvidence"), did),
      createdAt: s(p, "createdAt"),
    },
  };
}

// ── Attach `occurrence` to the generated GainforestDwcNS ─────────────────────

builder.objectFields(GainforestDwcNS, (t) => ({
    occurrence: t.field({
      type: GainforestDwcOccurrencePageType,
      description: "Paginated list of app.gainforest.dwc.occurrence records.",
      args: {
        cursor: t.arg.string(),
        limit:  t.arg.int(),
        where:  t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }),
        order:  t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage(
        "app.gainforest.dwc.occurrence",
        args,
        mapGainforestDwcOccurrence,
        { preFetch: (rows) => getPdsHostsBatch([...new Set(rows.map((r) => r.did))]) }
      ),
    }),
}));
