export type ConnectionEdge<Node> = {
  cursor?: string | null;
  node?: Node | null;
};

export type ConnectionPageInfo = {
  endCursor?: string | null;
  hasNextPage?: boolean | null;
};

export type ConnectionResult<Node> = {
  edges?: Array<ConnectionEdge<Node> | null> | null;
  pageInfo?: ConnectionPageInfo | null;
  totalCount?: number | null;
};

export type BlobLike = {
  ref?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

export type StrongRefLike = {
  uri?: string | null;
  cid?: string | null;
};

export type BskyFacetFeature = {
  did?: string | null;
  uri?: string | null;
  tag?: string | null;
};

export type BskyFacet = {
  index?: {
    byteStart?: number | null;
    byteEnd?: number | null;
  } | null;
  features?: Array<BskyFacetFeature | null> | null;
};

type NormalizedBskyFacetFeature =
  | { $type: "app.bsky.richtext.facet#mention"; did: string }
  | { $type: "app.bsky.richtext.facet#link"; uri: string }
  | { $type: "app.bsky.richtext.facet#tag"; tag: string };

type PlcDirectoryDocument = {
  service?: Array<{
    id?: string;
    type?: string;
    serviceEndpoint?: string;
  }>;
};

const pdsHostCache = new Map<string, Promise<string | null>>();

export function pluckConnectionNodes<Node>(connection: ConnectionResult<Node> | null | undefined): Node[] {
  return (connection?.edges ?? []).flatMap((edge) => {
    const node = edge?.node;
    return node ? [node] : [];
  });
}

export function connectionPageInfo(connection: ConnectionResult<unknown> | null | undefined): {
  endCursor: string | null;
  hasNextPage: boolean;
  count: number;
} {
  const count = connection?.totalCount ?? pluckConnectionNodes(connection).length;

  return {
    endCursor: connection?.pageInfo?.endCursor ?? null,
    hasNextPage: connection?.pageInfo?.hasNextPage ?? false,
    count,
  };
}

export function toLegacyBlob(blob: BlobLike | null | undefined): {
  uri: string | null;
  cid: string | null;
  mimeType: string | null;
  size: number | null;
} | null {
  if (!blob) return null;

  return {
    uri: null,
    cid: blob.ref ?? null,
    mimeType: blob.mimeType ?? null,
    size: blob.size ?? null,
  };
}

export function toLegacyStrongRef(ref: StrongRefLike | null | undefined): {
  uri: string | null;
  cid: string | null;
} | null {
  if (!ref) return null;

  return {
    uri: ref.uri ?? null,
    cid: ref.cid ?? null,
  };
}

export function normalizeBskyFacets(facets: Array<BskyFacet | null> | null | undefined): unknown[] {
  return (facets ?? []).flatMap((facet) => {
    if (!facet?.index) return [];

    const features = (facet.features ?? []).flatMap((feature): NormalizedBskyFacetFeature[] => {
      if (!feature) return [];
      if (typeof feature.did === "string") {
        return [{ $type: "app.bsky.richtext.facet#mention", did: feature.did }];
      }
      if (typeof feature.uri === "string") {
        return [{ $type: "app.bsky.richtext.facet#link", uri: feature.uri }];
      }
      if (typeof feature.tag === "string") {
        return [{ $type: "app.bsky.richtext.facet#tag", tag: feature.tag }];
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

export async function resolvePdsHostForDid(did: string): Promise<string | null> {
  const existing = pdsHostCache.get(did);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const response = await fetch(`https://plc.directory/${did}`);
      if (!response.ok) return null;

      const document = (await response.json()) as PlcDirectoryDocument;
      const endpoint = document.service?.find((item) => item.type === "AtprotoPersonalDataServer")?.serviceEndpoint;
      if (!endpoint) return null;

      return new URL(endpoint).host;
    } catch {
      return null;
    }
  })();

  pdsHostCache.set(did, promise);
  return promise;
}

export async function toResolvedLegacyBlob(blob: BlobLike | null | undefined, did: string): Promise<{
  uri: string | null;
  cid: string | null;
  mimeType: string | null;
  size: number | null;
} | null> {
  const normalized = toLegacyBlob(blob);
  if (!normalized || !normalized.cid) return normalized;

  const host = await resolvePdsHostForDid(did);
  if (!host) return normalized;

  return {
    ...normalized,
    uri: `https://${host}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${normalized.cid}`,
  };
}

export function normalizeDescriptionUnion(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const record = value as {
    value?: string;
    facets?: Array<BskyFacet | null> | null;
    uri?: string | null;
    cid?: string | null;
    blocks?: unknown;
  };

  if (typeof record.value === "string") {
    return {
      $type: "org.hypercerts.defs#descriptionString",
      value: record.value,
      facets: normalizeBskyFacets(record.facets),
    };
  }

  if ("uri" in record || "cid" in record) {
    return toLegacyStrongRef(record);
  }

  if ("blocks" in record) {
    return value;
  }

  return value;
}
