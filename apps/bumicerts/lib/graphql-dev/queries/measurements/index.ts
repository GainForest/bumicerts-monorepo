/**
 * Measurements query module.
 *
 * Fetches `app.gainforest.dwc.measurement` records authored by a given DID.
 * Uses the new bundled measurement shape when supported, but gracefully falls
 * back to the legacy per-measurement schema while migration is in progress.
 *
 * Leaf: queries.measurements
 */

import { ClientError } from "graphql-request";
import { graphqlClient } from "@/lib/graphql-dev/client";
import type { QueryModule } from "@/lib/graphql-dev/create-query";

const bundledDocument = /* GraphQL */ `
  query MeasurementsByDidBundled($did: String!) {
    gainforest {
      dwc {
        measurement(where: { did: $did }, order: DESC, sortBy: CREATED_AT) {
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
        }
      }
    }
  }
`;

const legacyDocument = /* GraphQL */ `
  query MeasurementsByDidLegacy($did: String!) {
    gainforest {
      dwc {
        measurement(where: { did: $did }, order: DESC, sortBy: CREATED_AT) {
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

export type MeasurementItem = {
  metadata: MeasurementMetadata;
  record: MeasurementRecord;
};

type BundledResponse = {
  gainforest?: {
    dwc?: {
      measurement?: {
        data?: Array<{
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
        }> | null;
      } | null;
    } | null;
  } | null;
};

type LegacyResponse = {
  gainforest?: {
    dwc?: {
      measurement?: {
        data?: Array<{
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
        }> | null;
      } | null;
    } | null;
  } | null;
};

export type Params = { did: string };
export type Result = MeasurementItem[];

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

function normalizeBundled(response: BundledResponse): Result {
  return (
    response.gainforest?.dwc?.measurement?.data?.map((item) => ({
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
    })) ?? []
  );
}

function normalizeLegacy(response: LegacyResponse): Result {
  return (
    response.gainforest?.dwc?.measurement?.data?.map((item) => ({
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
    })) ?? []
  );
}

export async function fetch(params: Params): Promise<Result> {
  try {
    const response = await graphqlClient.request<BundledResponse>(
      bundledDocument,
      { did: params.did }
    );
    return normalizeBundled(response);
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
        "Indexer schema still exposes legacy dwc.measurement fields; falling back to legacy measurement reads."
      );
    }

    const legacyResponse = await graphqlClient.request<LegacyResponse>(
      legacyDocument,
      { did: params.did }
    );

    return normalizeLegacy(legacyResponse);
  }
}

export const defaultOptions = {
  staleTime: 60 * 1_000,
} satisfies QueryModule<Params, Result>["defaultOptions"];

export function enabled(params: Params): boolean {
  return !!params.did;
}
