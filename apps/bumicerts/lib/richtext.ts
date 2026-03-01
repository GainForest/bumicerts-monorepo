import {
  defaultEditorClassNames,
  defaultDisplayClassNames,
  generateClassNames,
  type RichTextRecord,
  type FacetFeature,
} from "bsky-richtext-react";
import type { app } from "@gainforest/generated";
import { cn } from "@/lib/utils";

// Type aliases for cleaner code
type Richtext = app.gainforest.common.defs.Richtext;
type RichtextFacet = app.bsky.richtext.facet.Main;

const customClassNames = {
  mention: "text-primary",
  link: "text-primary",
};

export const richTextEditorClassNames = generateClassNames(
  [defaultEditorClassNames, customClassNames],
  cn
);

export const richTextDisplayClassNames = generateClassNames(
  [defaultDisplayClassNames, customClassNames],
  cn
);

const KNOWN_FEATURE_TYPES = new Set([
  "app.bsky.richtext.facet#mention",
  "app.bsky.richtext.facet#link",
  "app.bsky.richtext.facet#tag",
]);

/**
 * Type guard: checks whether a facet feature is a known type (mention, link, tag).
 */
function isKnownFacetFeature(
  f: { $type?: string }
): boolean {
  return typeof f.$type === "string" && KNOWN_FEATURE_TYPES.has(f.$type);
}

/**
 * Converts SDK Richtext (text + facets) to bsky-richtext-react's RichTextRecord
 * by filtering facet features to known types (mention, link, tag).
 */
export function toRichTextRecord(
  richtext: Richtext
): RichTextRecord {
  return {
    text: richtext.text,
    facets: richtext.facets
      ?.map((facet) => ({
        index: facet.index,
        features: facet.features.filter(isKnownFacetFeature) as FacetFeature[],
      }))
      .filter((facet) => facet.features.length > 0),
  };
}

/**
 * Converts SDK facets array to bsky-richtext-react Facet[] by filtering
 * features to known types. Use when you have facets separately from text.
 */
export function toRichTextFacets(
  facets: RichtextFacet[]
): RichTextRecord["facets"] {
  return facets
    .map((facet) => ({
      index: facet.index,
      features: facet.features.filter(isKnownFacetFeature) as FacetFeature[],
    }))
    .filter((facet) => facet.features.length > 0);
}
