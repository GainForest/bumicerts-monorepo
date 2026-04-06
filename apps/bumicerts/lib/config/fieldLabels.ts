import type { FieldLabels } from "@gainforest/atproto-mutations-next";

/**
 * User-friendly display labels for `app.gainforest.organization.info` fields.
 *
 * Keys match the lexicon field names exactly so they line up with the
 * `path[0]` value extracted from each `ValidationIssue`.
 */
export const organizationInfoLabels: FieldLabels = {
  displayName: "Organization name",
  shortDescription: "Short description",
  longDescription: "Description",
  country: "Country",
  website: "Website",
  startDate: "Founded date",
  objectives: "Objectives",
  logo: "Logo",
  coverImage: "Cover image",
  visibility: "Visibility",
};

/**
 * User-friendly display labels for `org.hypercerts.claim.activity` fields.
 *
 * Keys match the lexicon field names exactly.
 */
export const claimActivityLabels: FieldLabels = {
  title: "Title",
  description: "Description",
  workScope: "Work scope",
  workTimeframeStart: "Work start date",
  workTimeframeEnd: "Work end date",
  impactScope: "Impact scope",
  impactTimeframeStart: "Impact start date",
  impactTimeframeEnd: "Impact end date",
  contributors: "Contributors",
  rights: "Rights",
  uri: "URI",
  properties: "Properties",
  logo: "Logo",
  external: "External link",
};

/**
 * User-friendly display labels for `app.gainforest.certified.location` fields.
 */
export const certifiedLocationLabels: FieldLabels = {
  name: "Location name",
  description: "Description",
  shapefile: "Shapefile",
  geojson: "GeoJSON",
};
