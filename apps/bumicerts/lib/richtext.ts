import {
  defaultEditorClassNames,
  defaultDisplayClassNames,
  generateClassNames,
  type RichTextRecord,
  type FacetFeature,
} from "bsky-richtext-react";
import type { AppGainforestCommonDefs, AppBskyRichtextFacet } from "gainforest-sdk/lex-api";
import { cn } from "@/lib/utils";

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
 * Type guard: checks whether an SDK facet feature is a known
 * bsky-richtext-react FacetFeature (mention, link, or tag).
 */
function isKnownFacetFeature(
  f: AppBskyRichtextFacet.Main["features"][number]
): f is FacetFeature {
  return typeof f.$type === "string" && KNOWN_FEATURE_TYPES.has(f.$type);
}

/**
 * Converts SDK Richtext (text + facets) to bsky-richtext-react's RichTextRecord
 * by filtering facet features to known types (mention, link, tag).
 */
export function toRichTextRecord(
  richtext: AppGainforestCommonDefs.Richtext
): RichTextRecord {
  return {
    text: richtext.text,
    facets: richtext.facets
      ?.map((facet) => ({
        index: facet.index,
        features: facet.features.filter(isKnownFacetFeature),
      }))
      .filter((facet) => facet.features.length > 0),
  };
}

/**
 * Converts SDK facets array to bsky-richtext-react Facet[] by filtering
 * features to known types. Use when you have facets separately from text.
 */
export function toRichTextFacets(
  facets: AppBskyRichtextFacet.Main[]
): RichTextRecord["facets"] {
  return facets
    .map((facet) => ({
      index: facet.index,
      features: facet.features.filter(isKnownFacetFeature),
    }))
    .filter((facet) => facet.features.length > 0);
}
