"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/schemas/index.ts
var schemas_exports = {};
__export(schemas_exports, {
  LeafletBlobRefSchema: () => LeafletBlobRefSchema,
  LeafletBlockAlignmentSchema: () => LeafletBlockAlignmentSchema,
  LeafletBlockSchema: () => LeafletBlockSchema,
  LeafletBlockWrapperSchema: () => LeafletBlockWrapperSchema,
  LeafletBlockquoteBlockSchema: () => LeafletBlockquoteBlockSchema,
  LeafletByteSliceSchema: () => LeafletByteSliceSchema,
  LeafletCodeBlockSchema: () => LeafletCodeBlockSchema,
  LeafletFacetFeatureSchema: () => LeafletFacetFeatureSchema,
  LeafletFacetSchema: () => LeafletFacetSchema,
  LeafletHeaderBlockSchema: () => LeafletHeaderBlockSchema,
  LeafletHorizontalRuleBlockSchema: () => LeafletHorizontalRuleBlockSchema,
  LeafletIframeBlockSchema: () => LeafletIframeBlockSchema,
  LeafletImageBlockSchema: () => LeafletImageBlockSchema,
  LeafletLinearDocumentSchema: () => LeafletLinearDocumentSchema,
  LeafletListItemSchema: () => LeafletListItemSchema,
  LeafletTextBlockSchema: () => LeafletTextBlockSchema,
  LeafletUnorderedListBlockSchema: () => LeafletUnorderedListBlockSchema,
  LeafletWebsiteBlockSchema: () => LeafletWebsiteBlockSchema
});
module.exports = __toCommonJS(schemas_exports);
var import_zod = require("zod");
var LeafletByteSliceSchema = import_zod.z.object({
  byteStart: import_zod.z.number().int().nonnegative(),
  byteEnd: import_zod.z.number().int().nonnegative()
});
var LeafletFacetFeatureSchema = import_zod.z.discriminatedUnion("$type", [
  import_zod.z.object({ $type: import_zod.z.literal("pub.leaflet.richtext.facet#bold") }),
  import_zod.z.object({ $type: import_zod.z.literal("pub.leaflet.richtext.facet#italic") }),
  import_zod.z.object({ $type: import_zod.z.literal("pub.leaflet.richtext.facet#code") }),
  import_zod.z.object({ $type: import_zod.z.literal("pub.leaflet.richtext.facet#strikethrough") }),
  import_zod.z.object({ $type: import_zod.z.literal("pub.leaflet.richtext.facet#underline") }),
  import_zod.z.object({ $type: import_zod.z.literal("pub.leaflet.richtext.facet#highlight") }),
  import_zod.z.object({ $type: import_zod.z.literal("pub.leaflet.richtext.facet#link"), uri: import_zod.z.string() }),
  import_zod.z.object({ $type: import_zod.z.literal("pub.leaflet.richtext.facet#didMention"), did: import_zod.z.string() }),
  import_zod.z.object({ $type: import_zod.z.literal("pub.leaflet.richtext.facet#atMention"), atURI: import_zod.z.string() }),
  import_zod.z.object({ $type: import_zod.z.literal("pub.leaflet.richtext.facet#id"), id: import_zod.z.string().optional() })
]);
var LeafletFacetSchema = import_zod.z.object({
  index: LeafletByteSliceSchema,
  features: import_zod.z.array(LeafletFacetFeatureSchema)
});
var LeafletBlobRefSchema = import_zod.z.object({
  $type: import_zod.z.literal("blob"),
  ref: import_zod.z.object({ $link: import_zod.z.string() }),
  mimeType: import_zod.z.string(),
  size: import_zod.z.number()
});
var LeafletTextBlockSchema = import_zod.z.object({
  $type: import_zod.z.literal("pub.leaflet.blocks.text"),
  plaintext: import_zod.z.string(),
  facets: import_zod.z.array(LeafletFacetSchema).optional(),
  textSize: import_zod.z.enum(["default", "small", "large"]).optional()
});
var LeafletHeaderBlockSchema = import_zod.z.object({
  $type: import_zod.z.literal("pub.leaflet.blocks.header"),
  plaintext: import_zod.z.string(),
  facets: import_zod.z.array(LeafletFacetSchema).optional(),
  level: import_zod.z.number().int().min(1).max(6).optional()
});
var LeafletImageBlockSchema = import_zod.z.object({
  $type: import_zod.z.literal("pub.leaflet.blocks.image"),
  image: LeafletBlobRefSchema,
  alt: import_zod.z.string().optional(),
  aspectRatio: import_zod.z.object({ width: import_zod.z.number(), height: import_zod.z.number() }).optional()
});
var LeafletBlockquoteBlockSchema = import_zod.z.object({
  $type: import_zod.z.literal("pub.leaflet.blocks.blockquote"),
  plaintext: import_zod.z.string(),
  facets: import_zod.z.array(LeafletFacetSchema).optional()
});
var LeafletCodeBlockSchema = import_zod.z.object({
  $type: import_zod.z.literal("pub.leaflet.blocks.code"),
  plaintext: import_zod.z.string(),
  language: import_zod.z.string().optional(),
  syntaxHighlightingTheme: import_zod.z.string().optional()
});
var LeafletHorizontalRuleBlockSchema = import_zod.z.object({
  $type: import_zod.z.literal("pub.leaflet.blocks.horizontalRule")
});
var LeafletIframeBlockSchema = import_zod.z.object({
  $type: import_zod.z.literal("pub.leaflet.blocks.iframe"),
  url: import_zod.z.string(),
  height: import_zod.z.number().int().min(16).max(1600).optional()
});
var LeafletWebsiteBlockSchema = import_zod.z.object({
  $type: import_zod.z.literal("pub.leaflet.blocks.website"),
  src: import_zod.z.string(),
  title: import_zod.z.string().optional(),
  description: import_zod.z.string().optional()
});
var LeafletListItemSchema = import_zod.z.object({
  $type: import_zod.z.literal("pub.leaflet.blocks.unorderedList#listItem").optional(),
  content: import_zod.z.union([
    LeafletTextBlockSchema,
    LeafletHeaderBlockSchema,
    LeafletImageBlockSchema
  ]),
  children: import_zod.z.array(import_zod.z.lazy(() => LeafletListItemSchema)).optional()
});
var LeafletUnorderedListBlockSchema = import_zod.z.object({
  $type: import_zod.z.literal("pub.leaflet.blocks.unorderedList"),
  children: import_zod.z.array(LeafletListItemSchema)
});
var LeafletBlockSchema = import_zod.z.discriminatedUnion("$type", [
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
var LeafletBlockAlignmentSchema = import_zod.z.enum([
  "pub.leaflet.pages.linearDocument#textAlignLeft",
  "pub.leaflet.pages.linearDocument#textAlignCenter",
  "pub.leaflet.pages.linearDocument#textAlignRight",
  "pub.leaflet.pages.linearDocument#textAlignJustify"
]);
var LeafletBlockWrapperSchema = import_zod.z.object({
  $type: import_zod.z.literal("pub.leaflet.pages.linearDocument#block").optional(),
  block: LeafletBlockSchema,
  alignment: LeafletBlockAlignmentSchema.optional()
});
var LeafletLinearDocumentSchema = import_zod.z.object({
  $type: import_zod.z.literal("pub.leaflet.pages.linearDocument").optional(),
  id: import_zod.z.string().optional(),
  blocks: import_zod.z.array(LeafletBlockWrapperSchema)
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LeafletBlobRefSchema,
  LeafletBlockAlignmentSchema,
  LeafletBlockSchema,
  LeafletBlockWrapperSchema,
  LeafletBlockquoteBlockSchema,
  LeafletByteSliceSchema,
  LeafletCodeBlockSchema,
  LeafletFacetFeatureSchema,
  LeafletFacetSchema,
  LeafletHeaderBlockSchema,
  LeafletHorizontalRuleBlockSchema,
  LeafletIframeBlockSchema,
  LeafletImageBlockSchema,
  LeafletLinearDocumentSchema,
  LeafletListItemSchema,
  LeafletTextBlockSchema,
  LeafletUnorderedListBlockSchema,
  LeafletWebsiteBlockSchema
});
//# sourceMappingURL=index.cjs.map