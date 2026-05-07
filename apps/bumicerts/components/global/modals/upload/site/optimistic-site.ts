import type {
  CertifiedLocationMutationResult,
} from "@gainforest/atproto-mutations-next";
import type { CertifiedLocation } from "@/lib/graphql-dev/queries/locations";

export const SITE_CREATE_INVALIDATION_DELAY_MS = 5_000;

type IndexedCertifiedLocationRecord = NonNullable<CertifiedLocation["record"]>;

type BlobLikeWithPreviewUri = Record<string, unknown> & {
  uri: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function injectOptimisticLocationUrl(
  location: unknown,
  previewUrl: string,
): IndexedCertifiedLocationRecord["location"] {
  if (!isRecord(location)) {
    return location;
  }

  if (location["$type"] === "org.hypercerts.defs#uri") {
    return {
      ...location,
      uri: previewUrl,
    };
  }

  if (
    location["$type"] === "org.hypercerts.defs#smallBlob" &&
    isRecord(location["blob"])
  ) {
    const blob: BlobLikeWithPreviewUri = {
      ...location["blob"],
      uri: previewUrl,
    };

    return {
      ...location,
      blob,
    };
  }

  return location;
}

export function buildOptimisticCertifiedLocation(params: {
  did: string;
  result: CertifiedLocationMutationResult;
  previewUrl: string;
}): CertifiedLocation {
  const { did, result, previewUrl } = params;

  return {
    metadata: {
      did,
      uri: result.uri,
      rkey: result.rkey,
      cid: result.cid,
    },
    record: {
      name: result.record.name ?? null,
      description: result.record.description ?? null,
      locationType: result.record.locationType ?? null,
      location: injectOptimisticLocationUrl(result.record.location, previewUrl),
    },
  };
}
