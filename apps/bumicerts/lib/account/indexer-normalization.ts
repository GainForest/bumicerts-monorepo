import type {
  BlobLike,
  BskyFacet,
} from "@/graphql/indexer/queries/_migration-helpers";
import {
  normalizeBskyFacets,
  toResolvedLegacyBlob,
} from "@/graphql/indexer/queries/_migration-helpers";

type LeafletFacetFeatureLike = {
  __typename?: string;
  uri?: string | null;
  did?: string | null;
  atURI?: string | null;
  id?: string | null;
};

type LeafletFacetLike = {
  index?: {
    byteStart?: number | null;
    byteEnd?: number | null;
  } | null;
  features?: Array<LeafletFacetFeatureLike | null> | null;
};

type LeafletBlockWrapperLike = {
  alignment?: string | null;
  block?: unknown;
};

type LeafletDocumentLike = {
  __typename?: string;
  id?: string | null;
  blocks?: Array<LeafletBlockWrapperLike | null> | null;
};

type DescriptionStringLike = {
  __typename?: string;
  value?: string | null;
  facets?: Array<BskyFacet | null> | null;
};

type StrongRefLike = {
  __typename?: string;
  uri?: string | null;
  cid?: string | null;
};

type LeafletImageAspectRatioLike = {
  width?: number | null;
  height?: number | null;
};

type LeafletBlockLike = {
  __typename?: string;
  plaintext?: string | null;
  facets?: Array<LeafletFacetLike | null> | null;
  level?: number | null;
  image?: BlobLike | null;
  alt?: string | null;
  aspectRatio?: LeafletImageAspectRatioLike | null;
  children?: Array<LeafletUnorderedListItemLike | null> | null;
  language?: string | null;
  syntaxHighlightingTheme?: string | null;
  url?: string | null;
  height?: number | null;
  src?: string | null;
  title?: string | null;
  description?: string | null;
};

type LeafletUnorderedListItemLike = {
  checked?: boolean | null;
  children?: Array<LeafletUnorderedListItemLike | null> | null;
  content?: unknown;
};

function normalizeResolvedBlob(blob: BlobLike | null | undefined): unknown | null {
  if (!blob?.ref || !blob.mimeType || typeof blob.size !== "number") {
    return null;
  }

  return {
    $type: "blob",
    ref: blob.ref,
    mimeType: blob.mimeType,
    size: blob.size,
  };
}

function normalizeLeafletRichtextFacets(
  facets: Array<LeafletFacetLike | null> | null | undefined,
): unknown[] {
  return (facets ?? []).flatMap((facet) => {
    if (!facet?.index) return [];

    const features = (facet.features ?? []).flatMap((feature): unknown[] => {
      if (!feature) return [];

      if (
        feature.__typename === "PubLeafletRichtextFacetLink" &&
        typeof feature.uri === "string"
      ) {
        return [{ $type: "pub.leaflet.richtext.facet#link", uri: feature.uri }];
      }

      if (
        feature.__typename === "PubLeafletRichtextFacetDidMention" &&
        typeof feature.did === "string"
      ) {
        return [
          { $type: "pub.leaflet.richtext.facet#didMention", did: feature.did },
        ];
      }

      if (
        feature.__typename === "PubLeafletRichtextFacetAtMention" &&
        typeof feature.atURI === "string"
      ) {
        return [
          { $type: "pub.leaflet.richtext.facet#atMention", atURI: feature.atURI },
        ];
      }

      if (feature.__typename === "PubLeafletRichtextFacetId") {
        return [
          {
            $type: "pub.leaflet.richtext.facet#id",
            ...(typeof feature.id === "string" ? { id: feature.id } : {}),
          },
        ];
      }

      return [];
    });

    return [
      {
        index: {
          byteStart: facet.index.byteStart ?? 0,
          byteEnd: facet.index.byteEnd ?? 0,
        },
        features,
      },
    ];
  });
}

function normalizeImageAspectRatio(
  value: LeafletImageAspectRatioLike | null | undefined,
): { width: number; height: number } | undefined {
  if (typeof value?.width !== "number" || typeof value.height !== "number") {
    return undefined;
  }

  return {
    width: value.width,
    height: value.height,
  };
}

function normalizeLeafletUnorderedListItem(value: unknown): unknown | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as LeafletUnorderedListItemLike;
  const content = normalizeLeafletBlock(item.content);

  if (!content) {
    return null;
  }

  const children = (item.children ?? []).flatMap((child) => {
    const normalizedChild = normalizeLeafletUnorderedListItem(child);
    return normalizedChild ? [normalizedChild] : [];
  });

  return {
    $type: "pub.leaflet.blocks.unorderedList#listItem",
    content,
    ...(typeof item.checked === "boolean" ? { checked: item.checked } : {}),
    ...(children.length > 0 ? { children } : {}),
  };
}

function normalizeLeafletBlock(value: unknown): unknown | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const block = value as LeafletBlockLike;
  const facets = normalizeLeafletRichtextFacets(block.facets);

  if (block.__typename === "PubLeafletBlocksText") {
    return {
      $type: "pub.leaflet.blocks.text",
      plaintext: block.plaintext ?? "",
      ...(facets.length > 0 ? { facets } : {}),
    };
  }

  if (block.__typename === "PubLeafletBlocksHeader") {
    return {
      $type: "pub.leaflet.blocks.header",
      plaintext: block.plaintext ?? "",
      ...(typeof block.level === "number" ? { level: block.level } : {}),
      ...(facets.length > 0 ? { facets } : {}),
    };
  }

  if (block.__typename === "PubLeafletBlocksImage") {
    const image = normalizeResolvedBlob(block.image);

    if (!image) {
      return null;
    }

    const aspectRatio = normalizeImageAspectRatio(block.aspectRatio);

    return {
      $type: "pub.leaflet.blocks.image",
      image,
      ...(typeof block.alt === "string" ? { alt: block.alt } : {}),
      ...(aspectRatio ? { aspectRatio } : {}),
    };
  }

  if (block.__typename === "PubLeafletBlocksBlockquote") {
    return {
      $type: "pub.leaflet.blocks.blockquote",
      plaintext: block.plaintext ?? "",
      ...(facets.length > 0 ? { facets } : {}),
    };
  }

  if (block.__typename === "PubLeafletBlocksUnorderedList") {
    const children = (block.children ?? []).flatMap((item) => {
      const normalized = normalizeLeafletUnorderedListItem(item);
      return normalized ? [normalized] : [];
    });

    return {
      $type: "pub.leaflet.blocks.unorderedList",
      children,
    };
  }

  if (block.__typename === "PubLeafletBlocksCode") {
    return {
      $type: "pub.leaflet.blocks.code",
      plaintext: block.plaintext ?? "",
      ...(typeof block.language === "string" ? { language: block.language } : {}),
      ...(typeof block.syntaxHighlightingTheme === "string"
        ? { syntaxHighlightingTheme: block.syntaxHighlightingTheme }
        : {}),
    };
  }

  if (block.__typename === "PubLeafletBlocksHorizontalRule") {
    return { $type: "pub.leaflet.blocks.horizontalRule" };
  }

  if (block.__typename === "PubLeafletBlocksIframe") {
    if (typeof block.url !== "string") {
      return null;
    }

    return {
      $type: "pub.leaflet.blocks.iframe",
      url: block.url,
      ...(typeof block.height === "number" ? { height: block.height } : {}),
    };
  }

  if (block.__typename === "PubLeafletBlocksWebsite") {
    if (typeof block.src !== "string") {
      return null;
    }

    return {
      $type: "pub.leaflet.blocks.website",
      src: block.src,
      ...(typeof block.title === "string" ? { title: block.title } : {}),
      ...(typeof block.description === "string"
        ? { description: block.description }
        : {}),
    };
  }

  return null;
}

function normalizeLeafletDocument(value: LeafletDocumentLike): unknown {
  const blocks = (value.blocks ?? []).flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const normalizedBlock = normalizeLeafletBlock(item.block);

    if (!normalizedBlock) {
      return [];
    }

    return [
      {
        $type: "pub.leaflet.pages.linearDocument#block",
        ...(typeof item.alignment === "string"
          ? { alignment: item.alignment }
          : {}),
        block: normalizedBlock,
      },
    ];
  });

  return {
    $type: "pub.leaflet.pages.linearDocument",
    ...(typeof value.id === "string" ? { id: value.id } : {}),
    blocks,
  };
}

export async function normalizeProfileAvatarForRecord(
  value: unknown,
  did: string,
): Promise<unknown> {
  if (!value || typeof value !== "object") return value;

  const record = value as {
    __typename?: string;
    uri?: string | null;
    image?: BlobLike | null;
  };

  if (
    record.__typename === "OrgHypercertsDefsUri" &&
    typeof record.uri === "string"
  ) {
    return {
      $type: "org.hypercerts.defs#uri",
      uri: record.uri,
    };
  }

  if (record.__typename === "OrgHypercertsDefsSmallImage") {
    const resolved = await toResolvedLegacyBlob(record.image ?? null, did);

    return resolved?.uri
      ? {
          $type: "org.hypercerts.defs#uri",
          uri: resolved.uri,
        }
      : undefined;
  }

  return value;
}

export async function normalizeProfileBannerForRecord(
  value: unknown,
  did: string,
): Promise<unknown> {
  if (!value || typeof value !== "object") return value;

  const record = value as {
    __typename?: string;
    uri?: string | null;
    image?: BlobLike | null;
  };

  if (
    record.__typename === "OrgHypercertsDefsUri" &&
    typeof record.uri === "string"
  ) {
    return {
      $type: "org.hypercerts.defs#uri",
      uri: record.uri,
    };
  }

  if (record.__typename === "OrgHypercertsDefsLargeImage") {
    const resolved = await toResolvedLegacyBlob(record.image ?? null, did);

    return resolved?.uri
      ? {
          $type: "org.hypercerts.defs#uri",
          uri: resolved.uri,
        }
      : undefined;
  }

  return value;
}

export function normalizeOrganizationLongDescriptionForRecord(
  value: unknown,
): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  const description = value as
    | DescriptionStringLike
    | StrongRefLike
    | LeafletDocumentLike;

  if (
    description.__typename === "OrgHypercertsDefsDescriptionString" ||
    typeof (description as DescriptionStringLike).value === "string"
  ) {
    const descriptionString = description as DescriptionStringLike;
    const facets = normalizeBskyFacets(descriptionString.facets);

    return {
      $type: "org.hypercerts.defs#descriptionString",
      value: descriptionString.value ?? "",
      ...(facets.length > 0 ? { facets } : {}),
    };
  }

  if (
    description.__typename === "ComAtprotoRepoStrongRef" ||
    typeof (description as StrongRefLike).uri === "string" ||
    typeof (description as StrongRefLike).cid === "string"
  ) {
    const ref = description as StrongRefLike;

    return {
      $type: "com.atproto.repo.strongRef",
      uri: ref.uri ?? null,
      cid: ref.cid ?? null,
    };
  }

  if (
    description.__typename === "PubLeafletPagesLinearDocument" ||
    Array.isArray((description as LeafletDocumentLike).blocks)
  ) {
    return normalizeLeafletDocument(description as LeafletDocumentLike);
  }

  return value;
}
