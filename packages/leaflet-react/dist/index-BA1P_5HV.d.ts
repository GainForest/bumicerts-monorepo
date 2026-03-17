/**
 * Type definitions for the Leaflet lexicon (pub.leaflet.*).
 *
 * These are manually-authored types that match the lexicon schemas and are
 * compatible with the wire format returned by ATProto PDS endpoints.
 * They handle both the "canonical" field names from the current lexicon spec
 * and legacy field names from older record versions for backward compatibility.
 */
interface LeafletByteSlice {
    byteStart: number;
    byteEnd: number;
}
type LeafletFacetFeature = {
    $type: "pub.leaflet.richtext.facet#bold";
} | {
    $type: "pub.leaflet.richtext.facet#italic";
} | {
    $type: "pub.leaflet.richtext.facet#code";
} | {
    $type: "pub.leaflet.richtext.facet#strikethrough";
} | {
    $type: "pub.leaflet.richtext.facet#underline";
} | {
    $type: "pub.leaflet.richtext.facet#highlight";
} | {
    $type: "pub.leaflet.richtext.facet#link";
    uri: string;
} | {
    $type: "pub.leaflet.richtext.facet#didMention";
    did: string;
} | {
    $type: "pub.leaflet.richtext.facet#atMention";
    atURI: string;
} | {
    $type: "pub.leaflet.richtext.facet#id";
    id?: string;
};
interface LeafletFacet {
    index: LeafletByteSlice;
    features: LeafletFacetFeature[];
}
/**
 * JSON wire-format blob reference as stored in ATProto records returned by the PDS.
 */
interface LeafletBlobRef {
    $type: "blob";
    ref: {
        $link: string;
    };
    mimeType: string;
    size: number;
}
interface LeafletTextBlock {
    $type: "pub.leaflet.blocks.text";
    /** Canonical field (lexicon spec) */
    plaintext: string;
    facets?: LeafletFacet[];
    textSize?: "default" | "small" | "large";
}
interface LeafletHeaderBlock {
    $type: "pub.leaflet.blocks.header";
    /** Canonical field (lexicon spec) */
    plaintext: string;
    facets?: LeafletFacet[];
    /** Heading level 1–6. Defaults to 1. */
    level?: number;
}
interface LeafletImageBlock {
    $type: "pub.leaflet.blocks.image";
    image: LeafletBlobRef;
    alt?: string;
    aspectRatio?: {
        width: number;
        height: number;
    };
}
interface LeafletBlockquoteBlock {
    $type: "pub.leaflet.blocks.blockquote";
    /** Canonical field (lexicon spec) */
    plaintext: string;
    facets?: LeafletFacet[];
}
interface LeafletListItem {
    $type?: "pub.leaflet.blocks.unorderedList#listItem";
    content: LeafletTextBlock | LeafletHeaderBlock | LeafletImageBlock;
    children?: LeafletListItem[];
}
interface LeafletUnorderedListBlock {
    $type: "pub.leaflet.blocks.unorderedList";
    children: LeafletListItem[];
}
interface LeafletCodeBlock {
    $type: "pub.leaflet.blocks.code";
    /** Canonical field (lexicon spec) */
    plaintext: string;
    language?: string;
    syntaxHighlightingTheme?: string;
}
interface LeafletHorizontalRuleBlock {
    $type: "pub.leaflet.blocks.horizontalRule";
}
interface LeafletIframeBlock {
    $type: "pub.leaflet.blocks.iframe";
    url: string;
    /** Optional explicit height in pixels (16–1600). */
    height?: number;
}
interface LeafletWebsiteBlock {
    $type: "pub.leaflet.blocks.website";
    src: string;
    title?: string;
    description?: string;
}
type LeafletBlock = LeafletTextBlock | LeafletHeaderBlock | LeafletImageBlock | LeafletBlockquoteBlock | LeafletUnorderedListBlock | LeafletCodeBlock | LeafletHorizontalRuleBlock | LeafletIframeBlock | LeafletWebsiteBlock;
type LeafletBlockAlignment = "pub.leaflet.pages.linearDocument#textAlignLeft" | "pub.leaflet.pages.linearDocument#textAlignCenter" | "pub.leaflet.pages.linearDocument#textAlignRight" | "pub.leaflet.pages.linearDocument#textAlignJustify";
interface LeafletBlockWrapper {
    $type?: "pub.leaflet.pages.linearDocument#block";
    block: LeafletBlock;
    alignment?: LeafletBlockAlignment;
}
interface LeafletLinearDocument {
    $type?: "pub.leaflet.pages.linearDocument";
    id?: string;
    blocks: LeafletBlockWrapper[];
}
/**
 * The result of uploading an image to the ATProto PDS.
 * `cid` is the content identifier, `url` is a display URL (e.g. blob: or https:).
 */
interface ImageUploadResult {
    cid: string;
    url: string;
}

export type { ImageUploadResult as I, LeafletBlobRef as L, LeafletBlock as a, LeafletBlockAlignment as b, LeafletBlockWrapper as c, LeafletBlockquoteBlock as d, LeafletByteSlice as e, LeafletCodeBlock as f, LeafletFacet as g, LeafletFacetFeature as h, LeafletHeaderBlock as i, LeafletHorizontalRuleBlock as j, LeafletIframeBlock as k, LeafletImageBlock as l, LeafletLinearDocument as m, LeafletListItem as n, LeafletTextBlock as o, LeafletUnorderedListBlock as p, LeafletWebsiteBlock as q };
