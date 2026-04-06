declare module "@gainforest/leaflet-react" {
  export type LeafletBlock = {
    $type?: string;
    plaintext?: string;
    [key: string]: unknown;
  };

  export type LeafletLinearDocument = {
    $type?: string;
    blocks: Array<{
      block: LeafletBlock;
    }>;
  };

  export type ImageUploadResult = {
    cid: string;
    url: string;
    mimeType?: string;
    size?: number;
  };
}

declare module "@gainforest/leaflet-react/editor" {
  import type { ComponentType } from "react";

  export type LeafletEditorProps = Record<string, unknown>;
  export const LeafletEditor: ComponentType<Record<string, unknown>>;
}

declare module "@gainforest/leaflet-react/renderer" {
  import type { ComponentType } from "react";

  export type LeafletRendererProps = Record<string, unknown>;
  export const LeafletRenderer: ComponentType<Record<string, unknown>>;
}

declare module "@gainforest/leaflet-react/utils" {
  export function buildBlobUrl(
    pdsHost: string,
    did: string,
    cid: string
  ): string;
}

declare module "@gainforest/leaflet-react/richtext" {
  import type { ComponentType } from "react";

  export type FacetFeature = {
    $type?: string;
    did?: string;
    uri?: string;
    tag?: string;
    [key: string]: unknown;
  };
  export type Facet = {
    index: {
      byteStart: number;
      byteEnd: number;
    };
    features: FacetFeature[];
  };
  export type RichTextRecord = {
    text: string;
    facets?: Facet[];
  };
  export type RichTextEditorRef = unknown;
  export type MentionProps = {
    text: string;
    did: string;
  };

  export const RichTextEditor: ComponentType<Record<string, unknown>>;
  export const RichTextDisplay: ComponentType<Record<string, unknown>>;
}

declare module "@gainforest/leaflet-react/schemas" {
  import type { z } from "zod";
  import type { LeafletLinearDocument } from "@gainforest/leaflet-react";

  export const LeafletLinearDocumentSchema: z.ZodType<LeafletLinearDocument>;
}
