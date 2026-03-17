// src/schemas/index.ts
import { z } from "zod";
var LeafletByteSliceSchema = z.object({
  byteStart: z.number().int().nonnegative(),
  byteEnd: z.number().int().nonnegative()
});
var LeafletFacetFeatureSchema = z.discriminatedUnion("$type", [
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#bold") }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#italic") }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#code") }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#strikethrough") }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#underline") }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#highlight") }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#link"), uri: z.string() }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#didMention"), did: z.string() }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#atMention"), atURI: z.string() }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#id"), id: z.string().optional() })
]);
var LeafletFacetSchema = z.object({
  index: LeafletByteSliceSchema,
  features: z.array(LeafletFacetFeatureSchema)
});
var LeafletBlobRefSchema = z.object({
  $type: z.literal("blob"),
  ref: z.object({ $link: z.string() }),
  mimeType: z.string(),
  size: z.number()
});
var LeafletTextBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.text"),
  plaintext: z.string(),
  facets: z.array(LeafletFacetSchema).optional(),
  textSize: z.enum(["default", "small", "large"]).optional()
});
var LeafletHeaderBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.header"),
  plaintext: z.string(),
  facets: z.array(LeafletFacetSchema).optional(),
  level: z.number().int().min(1).max(6).optional()
});
var LeafletImageBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.image"),
  image: LeafletBlobRefSchema,
  alt: z.string().optional(),
  aspectRatio: z.object({ width: z.number(), height: z.number() }).optional()
});
var LeafletBlockquoteBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.blockquote"),
  plaintext: z.string(),
  facets: z.array(LeafletFacetSchema).optional()
});
var LeafletCodeBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.code"),
  plaintext: z.string(),
  language: z.string().optional(),
  syntaxHighlightingTheme: z.string().optional()
});
var LeafletHorizontalRuleBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.horizontalRule")
});
var LeafletIframeBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.iframe"),
  url: z.string(),
  height: z.number().int().min(16).max(1600).optional()
});
var LeafletWebsiteBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.website"),
  src: z.string(),
  title: z.string().optional(),
  description: z.string().optional()
});
var LeafletListItemSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.unorderedList#listItem").optional(),
  content: z.union([
    LeafletTextBlockSchema,
    LeafletHeaderBlockSchema,
    LeafletImageBlockSchema
  ]),
  children: z.array(z.lazy(() => LeafletListItemSchema)).optional()
});
var LeafletUnorderedListBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.unorderedList"),
  children: z.array(LeafletListItemSchema)
});
var LeafletBlockSchema = z.discriminatedUnion("$type", [
  LeafletTextBlockSchema,
  LeafletHeaderBlockSchema,
  LeafletImageBlockSchema,
  LeafletBlockquoteBlockSchema,
  LeafletUnorderedListBlockSchema,
  LeafletCodeBlockSchema,
  LeafletHorizontalRuleBlockSchema,
  LeafletIframeBlockSchema,
  LeafletWebsiteBlockSchema
]);
var LeafletBlockAlignmentSchema = z.enum([
  "pub.leaflet.pages.linearDocument#textAlignLeft",
  "pub.leaflet.pages.linearDocument#textAlignCenter",
  "pub.leaflet.pages.linearDocument#textAlignRight",
  "pub.leaflet.pages.linearDocument#textAlignJustify"
]);
var LeafletBlockWrapperSchema = z.object({
  $type: z.literal("pub.leaflet.pages.linearDocument#block").optional(),
  block: LeafletBlockSchema,
  alignment: LeafletBlockAlignmentSchema.optional()
});
var LeafletLinearDocumentSchema = z.object({
  $type: z.literal("pub.leaflet.pages.linearDocument").optional(),
  id: z.string().optional(),
  blocks: z.array(LeafletBlockWrapperSchema)
});

export {
  LeafletByteSliceSchema,
  LeafletFacetFeatureSchema,
  LeafletFacetSchema,
  LeafletBlobRefSchema,
  LeafletTextBlockSchema,
  LeafletHeaderBlockSchema,
  LeafletImageBlockSchema,
  LeafletBlockquoteBlockSchema,
  LeafletCodeBlockSchema,
  LeafletHorizontalRuleBlockSchema,
  LeafletIframeBlockSchema,
  LeafletWebsiteBlockSchema,
  LeafletListItemSchema,
  LeafletUnorderedListBlockSchema,
  LeafletBlockSchema,
  LeafletBlockAlignmentSchema,
  LeafletBlockWrapperSchema,
  LeafletLinearDocumentSchema
};
//# sourceMappingURL=chunk-K5MQ45N6.js.map