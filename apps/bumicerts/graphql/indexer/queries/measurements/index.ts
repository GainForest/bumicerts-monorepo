/**
 * Measurements query module.
 *
 * Scratch migration target:
 *   appGainforestDwcMeasurement(...) { edges { node { ... } } pageInfo }
 */

import { ClientError } from "graphql-request";
import {
  graphql,
  graphqlClient,
  type ResultOf,
} from "@/graphql/indexer";
import type { ConnectionNode } from "../_connection";
import { connectionPageInfo, pluckConnectionNodes } from "../_migration-helpers";

const document = graphql(`
  query MeasurementsByDid($did: String!, $first: Int, $after: String) {
    appGainforestDwcMeasurement(
      where: { did: { eq: $did } }
      first: $first
      after: $after
      sortDirection: DESC
      sortBy: createdAt
    ) {
      edges {
        node {
          did
          uri
          rkey
          cid
          createdAt
          occurrenceRef
          measuredBy
          measuredByID
          measurementDate
          measurementMethod
          measurementRemarks
          result {
            __typename
            ... on AppGainforestDwcMeasurementFloraMeasurement {
              dbh
              dbhMeasurementHeight
              girth
              basalDiameter
              basalArea
              stemCount
              totalHeight
              heightToFirstBranch
              buttressHeight
              heightMeasurementMethod
              crownDiameter
              crownDepth
              canopyCoverPercent
              crownPosition
              crownDieback
              abovegroundBiomass
              belowgroundBiomass
              carbonContent
              woodDensity
              biomassAllometricEquation
              annualDiameterIncrement
              estimatedAge
              growthForm
              vitalityStatus
              healthScore
              damageType
              damageCause
              decayClass
              floweringStatus
              phenology
              leafAreaIndex
              colonyDiameter
              colonyHeight
              colonyMorphology
              bleachingStatus
              liveTissueCoverPercent
              depthBelowSurface
              additionalMeasurements {
                measurementType
                measurementValue
                measurementUnit
                measurementMethod
                measurementAccuracy
                measurementRemarks
              }
            }
            ... on AppGainforestDwcMeasurementFaunaMeasurement {
              bodyMass
              totalLength
              headBodyLength
              tailLength
              wingLength
              wingspan
              billLength
              billDepth
              tarsusLength
              fatScore
              pectoralMuscleScore
              hindFootLength
              earLength
              forearmLength
              shoulderHeight
              snoutVentLength
              carapaceLength
              carapaceWidth
              standardLength
              forkLength
              groupSize
              clutchSize
              litterSize
              broodSize
              nestHeight
              bodyConditionScore
              bodyConditionIndex
              injuryPresent
              injuryDescription
              diseaseSignsPresent
              diseaseDescription
              ectoparasiteLoad
              tagId
              tagType
              bandNumber
              colorBandCombination
              pitTagId
              recaptureStatus
              markDescription
              geneticSampleId
              additionalMeasurements {
                measurementType
                measurementValue
                measurementUnit
                measurementMethod
                measurementAccuracy
                measurementRemarks
              }
            }
            ... on AppGainforestDwcMeasurementGenericMeasurement {
              measurements {
                measurementType
                measurementValue
                measurementUnit
                measurementMethod
                measurementRemarks
                measurementAccuracy
              }
            }
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
      totalCount
    }
  }
`);

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
  schemaVersion: string;
};

type MeasurementNode = ConnectionNode<
  ResultOf<typeof document>["appGainforestDwcMeasurement"]
>;
type MeasurementResultNode = NonNullable<MeasurementNode["result"]>;
type FloraMeasurementResultNode = Extract<
  MeasurementResultNode,
  { __typename: "AppGainforestDwcMeasurementFloraMeasurement" }
>;
type FaunaMeasurementResultNode = Extract<
  MeasurementResultNode,
  { __typename: "AppGainforestDwcMeasurementFaunaMeasurement" }
>;
type GenericMeasurementResultNode = Extract<
  MeasurementResultNode,
  { __typename: "AppGainforestDwcMeasurementGenericMeasurement" }
>;
type MeasurementEntryNode =
  | NonNullable<NonNullable<FloraMeasurementResultNode["additionalMeasurements"]>[number]>
  | NonNullable<NonNullable<FaunaMeasurementResultNode["additionalMeasurements"]>[number]>
  | NonNullable<GenericMeasurementResultNode["measurements"][number]>;

export type MeasurementItem = {
  metadata: MeasurementMetadata;
  record: MeasurementRecord;
};

export type Params = { did: string };
export type Result = MeasurementItem[];

const PAGE_SIZE = 200;
const MAX_PAGES = 50;

const FLORA_RESULT_FIELD_ORDER = [
  "dbh",
  "totalHeight",
  "basalDiameter",
  "canopyCoverPercent",
  "dbhMeasurementHeight",
  "girth",
  "basalArea",
  "stemCount",
  "heightToFirstBranch",
  "buttressHeight",
  "heightMeasurementMethod",
  "crownDiameter",
  "crownDepth",
  "crownPosition",
  "crownDieback",
  "abovegroundBiomass",
  "belowgroundBiomass",
  "carbonContent",
  "woodDensity",
  "biomassAllometricEquation",
  "annualDiameterIncrement",
  "estimatedAge",
  "growthForm",
  "vitalityStatus",
  "healthScore",
  "damageType",
  "damageCause",
  "decayClass",
  "floweringStatus",
  "phenology",
  "leafAreaIndex",
  "colonyDiameter",
  "colonyHeight",
  "colonyMorphology",
  "bleachingStatus",
  "liveTissueCoverPercent",
  "depthBelowSurface",
  "additionalMeasurements",
] as const;

const FAUNA_RESULT_FIELD_ORDER = [
  "bodyMass",
  "totalLength",
  "headBodyLength",
  "tailLength",
  "wingLength",
  "wingspan",
  "billLength",
  "billDepth",
  "tarsusLength",
  "fatScore",
  "pectoralMuscleScore",
  "hindFootLength",
  "earLength",
  "forearmLength",
  "shoulderHeight",
  "snoutVentLength",
  "carapaceLength",
  "carapaceWidth",
  "standardLength",
  "forkLength",
  "groupSize",
  "clutchSize",
  "litterSize",
  "broodSize",
  "nestHeight",
  "bodyConditionScore",
  "bodyConditionIndex",
  "injuryPresent",
  "injuryDescription",
  "diseaseSignsPresent",
  "diseaseDescription",
  "ectoparasiteLoad",
  "tagId",
  "tagType",
  "bandNumber",
  "colorBandCombination",
  "pitTagId",
  "recaptureStatus",
  "markDescription",
  "geneticSampleId",
  "additionalMeasurements",
] as const;

function isRequestError(error: unknown): boolean {
  return error instanceof ClientError;
}

function appendIfPresent(target: Record<string, unknown>, key: string, value: unknown) {
  if (value !== null && value !== undefined) {
    target[key] = value;
  }
}

function toLegacyMeasurementEntry(entry: MeasurementEntryNode): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  appendIfPresent(normalized, "measurementType", entry.measurementType);
  appendIfPresent(normalized, "measurementValue", entry.measurementValue);
  appendIfPresent(normalized, "measurementUnit", entry.measurementUnit);
  appendIfPresent(normalized, "measurementMethod", entry.measurementMethod);
  appendIfPresent(normalized, "measurementAccuracy", entry.measurementAccuracy);
  appendIfPresent(normalized, "measurementRemarks", entry.measurementRemarks);

  return normalized;
}

function normalizeMeasurementEntries(entries: Array<MeasurementEntryNode | null> | null | undefined) {
  if (!entries) {
    return undefined;
  }

  return entries.flatMap((entry) => (entry ? [toLegacyMeasurementEntry(entry)] : []));
}

function toOrderedLegacyResult(
  type: string,
  source: Record<string, unknown>,
  fieldOrder: readonly string[],
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  let insertedType = false;

  for (const field of fieldOrder) {
    const value = source[field];
    if (value === null || value === undefined) {
      continue;
    }

    normalized[field] = value;
    if (!insertedType) {
      normalized.$type = type;
      insertedType = true;
    }
  }

  if (!insertedType) {
    normalized.$type = type;
  }

  return normalized;
}

function normalizeResult(value: MeasurementResultNode | null): unknown | null {
  if (!value) {
    return null;
  }

  if (value.__typename === "AppGainforestDwcMeasurementFloraMeasurement") {
    const additionalMeasurements = normalizeMeasurementEntries(value.additionalMeasurements);

    return toOrderedLegacyResult(
      "app.gainforest.dwc.measurement#floraMeasurement",
      {
        ...value,
        additionalMeasurements,
      },
      FLORA_RESULT_FIELD_ORDER,
    );
  }

  if (value.__typename === "AppGainforestDwcMeasurementFaunaMeasurement") {
    const additionalMeasurements = normalizeMeasurementEntries(value.additionalMeasurements);

    return toOrderedLegacyResult(
      "app.gainforest.dwc.measurement#faunaMeasurement",
      {
        ...value,
        additionalMeasurements,
      },
      FAUNA_RESULT_FIELD_ORDER,
    );
  }

  return toOrderedLegacyResult(
    "app.gainforest.dwc.measurement#genericMeasurement",
    {
      measurements: normalizeMeasurementEntries(value.measurements) ?? [],
    },
    ["measurements"],
  );
}

function toMeasurementItem(node: MeasurementNode): MeasurementItem {
  return {
    metadata: {
      did: node.did,
      uri: node.uri,
      rkey: node.rkey,
      cid: node.cid,
      createdAt: node.createdAt,
    },
    record: {
      occurrenceRef: node.occurrenceRef,
      result: normalizeResult(node.result),
      measuredBy: node.measuredBy,
      measuredByID: node.measuredByID,
      measurementDate: node.measurementDate,
      measurementMethod: node.measurementMethod,
      measurementRemarks: node.measurementRemarks,
      createdAt: node.createdAt,
      legacyMeasurementType: null,
      legacyMeasurementValue: null,
      legacyMeasurementUnit: null,
      schemaVersion: "bundled",
    },
  } satisfies MeasurementItem;
}

export async function fetch(params: Params): Promise<Result> {
  try {
    const allMeasurements: MeasurementItem[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const response = await graphqlClient.request(document, {
        did: params.did,
        first: PAGE_SIZE,
        after: cursor,
      });

      const measurement = response.appGainforestDwcMeasurement;
      allMeasurements.push(...pluckConnectionNodes(measurement).map(toMeasurementItem));

      const pageInfo = connectionPageInfo(measurement);
      if (pageInfo.hasNextPage && !pageInfo.endCursor) {
        throw new Error(
          `appGainforestDwcMeasurement for ${params.did} reported hasNextPage without an endCursor on page ${page + 1}`,
        );
      }

      if (pageInfo.hasNextPage && pageInfo.endCursor) {
        if (page === MAX_PAGES - 1) {
          console.warn(
            `Measurements query hit pagination safety cap for ${params.did}; results may be truncated.`,
          );
          break;
        }

        cursor = pageInfo.endCursor;
        continue;
      }

      break;
    }

    return allMeasurements;
  } catch (error) {
    if (!isRequestError(error)) {
      throw error;
    }

    throw error;
  }
}
