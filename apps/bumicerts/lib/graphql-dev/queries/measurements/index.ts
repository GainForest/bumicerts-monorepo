/**
 * Measurements query module.
 *
 * Fetches all `app.gainforest.dwc.measurement` records authored by a given DID.
 * Uses the bundled measurement shape when supported, but gracefully falls back
 * to the legacy per-measurement schema while migration is in progress.
 *
 * Leaf: queries.measurements
 */

import { ClientError } from "graphql-request";
import { graphqlClient } from "@/lib/graphql-dev/client";
import type { QueryModule } from "@/lib/graphql-dev/create-query";

const bundledDocument = /* GraphQL */ `
  query MeasurementsByDidBundled($did: String!, $limit: Int, $cursor: String) {
    gainforest {
      dwc {
        measurement(
          where: { did: $did }
          limit: $limit
          cursor: $cursor
          order: DESC
          sortBy: CREATED_AT
        ) {
          data {
            metadata {
              did
              uri
              rkey
              cid
              createdAt
            }
            record {
              occurrenceRef
              result
              measuredBy
              measuredByID
              measurementDate
              measurementMethod
              measurementRemarks
              createdAt
            }
          }
          pageInfo {
            endCursor
            hasNextPage
            count
          }
        }
      }
    }
  }
`;

const legacyDocument = /* GraphQL */ `
  query MeasurementsByDidLegacy($did: String!, $limit: Int, $cursor: String) {
    gainforest {
      dwc {
        measurement(
          where: { did: $did }
          limit: $limit
          cursor: $cursor
          order: DESC
          sortBy: CREATED_AT
        ) {
          data {
            metadata {
              did
              uri
              rkey
              cid
              createdAt
            }
            record {
              occurrenceRef
              measurementType
              measurementValue
              measurementUnit
              measurementMethod
              measurementRemarks
              createdAt
            }
          }
          pageInfo {
            endCursor
            hasNextPage
            count
          }
        }
      }
    }
  }
`;

type MeasurementMetadata = {
  did: string;
  uri: string;
  rkey: string;
  cid: string;
  createdAt: string | null;
};

type MeasurementRecord = {
  occurrenceRef: string | null;
  result: unknown | null;
  measuredBy: string | null;
  measuredByID: string | null;
  measurementDate: string | null;
  measurementMethod: string | null;
  measurementRemarks: string | null;
  createdAt: string | null;
  legacyMeasurementType: string | null;
  legacyMeasurementValue: string | null;
  legacyMeasurementUnit: string | null;
  schemaVersion: "bundled" | "legacy";
};

type PageInfo = {
  endCursor: string | null;
  hasNextPage: boolean;
  count: number;
};

type BundledMeasurementPageItem = {
  metadata: MeasurementMetadata;
  record: {
    occurrenceRef: string | null;
    result: unknown | null;
    measuredBy: string | null;
    measuredByID: string | null;
    measurementDate: string | null;
    measurementMethod: string | null;
    measurementRemarks: string | null;
    createdAt: string | null;
  };
};

type LegacyMeasurementPageItem = {
  metadata: MeasurementMetadata;
  record: {
    occurrenceRef: string | null;
    measurementType: string | null;
    measurementValue: string | null;
    measurementUnit: string | null;
    measurementMethod: string | null;
    measurementRemarks: string | null;
    createdAt: string | null;
  };
};

export type MeasurementItem = {
  metadata: MeasurementMetadata;
  record: MeasurementRecord;
};

type BundledResponse = {
  gainforest?: {
    dwc?: {
      measurement?: {
        data?: BundledMeasurementPageItem[] | null;
        pageInfo?: PageInfo | null;
      } | null;
    } | null;
  } | null;
};

type LegacyResponse = {
  gainforest?: {
    dwc?: {
      measurement?: {
        data?: LegacyMeasurementPageItem[] | null;
        pageInfo?: PageInfo | null;
      } | null;
    } | null;
  } | null;
};

export type Params = { did: string };
export type Result = MeasurementItem[];

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

let hasWarnedLegacyMeasurementSchema = false;

function isUnsupportedBundledMeasurementQuery(error: unknown): boolean {
  if (!(error instanceof ClientError)) {
    return false;
  }

  return (
    error.response.errors?.some((item) => {
      const message = item.message.toLowerCase();

      return (
        (message.includes("cannot query field") &&
          (message.includes("result") ||
            message.includes("measuredby") ||
            message.includes("measurementdate"))) ||
        (message.includes("unknown field") &&
          (message.includes("result") ||
            message.includes("measuredby") ||
            message.includes("measurementdate")))
      );
    }) ?? false
  );
}

function normalizeBundledItems(items: BundledMeasurementPageItem[]): Result {
  return items.map((item) => ({
    metadata: item.metadata,
    record: {
      occurrenceRef: item.record.occurrenceRef,
      result: item.record.result,
      measuredBy: item.record.measuredBy,
      measuredByID: item.record.measuredByID,
      measurementDate: item.record.measurementDate,
      measurementMethod: item.record.measurementMethod,
      measurementRemarks: item.record.measurementRemarks,
      createdAt: item.record.createdAt,
      legacyMeasurementType: null,
      legacyMeasurementValue: null,
      legacyMeasurementUnit: null,
      schemaVersion: "bundled",
    },
  }));
}

function normalizeLegacyItems(items: LegacyMeasurementPageItem[]): Result {
  return items.map((item) => ({
    metadata: item.metadata,
    record: {
      occurrenceRef: item.record.occurrenceRef,
      result: null,
      measuredBy: null,
      measuredByID: null,
      measurementDate: null,
      measurementMethod: item.record.measurementMethod,
      measurementRemarks: item.record.measurementRemarks,
      createdAt: item.record.createdAt,
      legacyMeasurementType: item.record.measurementType,
      legacyMeasurementValue: item.record.measurementValue,
      legacyMeasurementUnit: item.record.measurementUnit,
      schemaVersion: "legacy",
    },
  }));
}

async function fetchBundledMeasurements(params: Params): Promise<Result> {
  const allMeasurements: MeasurementItem[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await graphqlClient.request<BundledResponse>(bundledDocument, {
      did: params.did,
      limit: PAGE_SIZE,
      cursor,
    });

    const measurement = response.gainforest?.dwc?.measurement;
    allMeasurements.push(...normalizeBundledItems(measurement?.data ?? []));

    const pageInfo = measurement?.pageInfo;
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      if (page === MAX_PAGES - 1) {
        console.warn(
          `Bundled measurements query hit pagination safety cap for ${params.did}; results may be truncated.`,
        );
        break;
      }

      cursor = pageInfo.endCursor;
      continue;
    }

    break;
  }

  return allMeasurements;
}

async function fetchLegacyMeasurements(params: Params): Promise<Result> {
  const allMeasurements: MeasurementItem[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await graphqlClient.request<LegacyResponse>(legacyDocument, {
      did: params.did,
      limit: PAGE_SIZE,
      cursor,
    });

    const measurement = response.gainforest?.dwc?.measurement;
    allMeasurements.push(...normalizeLegacyItems(measurement?.data ?? []));

    const pageInfo = measurement?.pageInfo;
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      if (page === MAX_PAGES - 1) {
        console.warn(
          `Legacy measurements query hit pagination safety cap for ${params.did}; results may be truncated.`,
        );
        break;
      }

      cursor = pageInfo.endCursor;
      continue;
    }

    break;
  }

  return allMeasurements;
}

export async function fetch(params: Params): Promise<Result> {
  try {
    return await fetchBundledMeasurements(params);
  } catch (error) {
    if (!isUnsupportedBundledMeasurementQuery(error)) {
      throw error;
    }

    if (
      process.env.NODE_ENV !== "production" &&
      !hasWarnedLegacyMeasurementSchema
    ) {
      hasWarnedLegacyMeasurementSchema = true;
      console.warn(
        "Indexer schema still exposes legacy dwc.measurement fields; falling back to legacy measurement reads.",
      );
    }

    return fetchLegacyMeasurements(params);
  }
}

export const defaultOptions = {
  staleTime: 60 * 1_000,
} satisfies QueryModule<Params, Result>["defaultOptions"];

export function enabled(params: Params): boolean {
  return !!params.did;
}
