/**
 * Measurements query module.
 *
 * Scratch migration target:
 *   appGainforestDwcMeasurement(...) { edges { node { ... } } pageInfo }
 */

import { ClientError } from "graphql-request";
import { GraphQLClient } from "graphql-request";
import type { ConnectionResult } from "../_migration-helpers";
import { connectionPageInfo, pluckConnectionNodes } from "../_migration-helpers";

const endpoint = process.env.NEXT_PUBLIC_INDEXER_URL;

if (!endpoint) {
  throw new Error("NEXT_PUBLIC_INDEXER_URL must be set for measurements queries");
}

const graphqlClient = new GraphQLClient(endpoint, {
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

const document = /* GraphQL */ `
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
  schemaVersion: string;
};

type MeasurementNode = {
  did: string;
  uri: string;
  rkey: string;
  cid: string;
  createdAt: string;
  occurrenceRef: string;
  measuredBy: string | null;
  measuredByID: string | null;
  measurementDate: string | null;
  measurementMethod: string | null;
  measurementRemarks: string | null;
  result: MeasurementResultNode | null;
};

type MeasurementEntryNode = {
  measurementType: string;
  measurementValue: string;
  measurementUnit?: string | null;
  measurementMethod?: string | null;
  measurementAccuracy?: string | null;
  measurementRemarks?: string | null;
};

type FloraMeasurementResultNode = {
  __typename: "AppGainforestDwcMeasurementFloraMeasurement";
  dbh?: string | null;
  dbhMeasurementHeight?: string | null;
  girth?: string | null;
  basalDiameter?: string | null;
  basalArea?: string | null;
  stemCount?: number | null;
  totalHeight?: string | null;
  heightToFirstBranch?: string | null;
  buttressHeight?: string | null;
  heightMeasurementMethod?: string | null;
  crownDiameter?: string | null;
  crownDepth?: string | null;
  canopyCoverPercent?: string | null;
  crownPosition?: string | null;
  crownDieback?: string | null;
  abovegroundBiomass?: string | null;
  belowgroundBiomass?: string | null;
  carbonContent?: string | null;
  woodDensity?: string | null;
  biomassAllometricEquation?: string | null;
  annualDiameterIncrement?: string | null;
  estimatedAge?: string | null;
  growthForm?: string | null;
  vitalityStatus?: string | null;
  healthScore?: string | null;
  damageType?: string | null;
  damageCause?: string | null;
  decayClass?: string | null;
  floweringStatus?: string | null;
  phenology?: string | null;
  leafAreaIndex?: string | null;
  colonyDiameter?: string | null;
  colonyHeight?: string | null;
  colonyMorphology?: string | null;
  bleachingStatus?: string | null;
  liveTissueCoverPercent?: string | null;
  depthBelowSurface?: string | null;
  additionalMeasurements?: Array<MeasurementEntryNode | null> | null;
};

type FaunaMeasurementResultNode = {
  __typename: "AppGainforestDwcMeasurementFaunaMeasurement";
  bodyMass?: string | null;
  totalLength?: string | null;
  headBodyLength?: string | null;
  tailLength?: string | null;
  wingLength?: string | null;
  wingspan?: string | null;
  billLength?: string | null;
  billDepth?: string | null;
  tarsusLength?: string | null;
  fatScore?: string | null;
  pectoralMuscleScore?: string | null;
  hindFootLength?: string | null;
  earLength?: string | null;
  forearmLength?: string | null;
  shoulderHeight?: string | null;
  snoutVentLength?: string | null;
  carapaceLength?: string | null;
  carapaceWidth?: string | null;
  standardLength?: string | null;
  forkLength?: string | null;
  groupSize?: number | null;
  clutchSize?: number | null;
  litterSize?: number | null;
  broodSize?: number | null;
  nestHeight?: string | null;
  bodyConditionScore?: string | null;
  bodyConditionIndex?: string | null;
  injuryPresent?: boolean | null;
  injuryDescription?: string | null;
  diseaseSignsPresent?: boolean | null;
  diseaseDescription?: string | null;
  ectoparasiteLoad?: string | null;
  tagId?: string | null;
  tagType?: string | null;
  bandNumber?: string | null;
  colorBandCombination?: string | null;
  pitTagId?: string | null;
  recaptureStatus?: string | null;
  markDescription?: string | null;
  geneticSampleId?: string | null;
  additionalMeasurements?: Array<MeasurementEntryNode | null> | null;
};

type GenericMeasurementResultNode = {
  __typename: "AppGainforestDwcMeasurementGenericMeasurement";
  measurements: MeasurementEntryNode[];
};

type MeasurementResultNode =
  | FloraMeasurementResultNode
  | FaunaMeasurementResultNode
  | GenericMeasurementResultNode;

export type MeasurementItem = {
  metadata: MeasurementMetadata;
  record: MeasurementRecord;
};

type MeasurementResponse = {
  appGainforestDwcMeasurement?: ConnectionResult<MeasurementNode> | null;
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
  };
}

export async function fetch(params: Params): Promise<Result> {
  try {
    const allMeasurements: MeasurementItem[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const response = await graphqlClient.request<MeasurementResponse>(document, {
        did: params.did,
        first: PAGE_SIZE,
        after: cursor,
      });

      const measurement = response.appGainforestDwcMeasurement;
      allMeasurements.push(...pluckConnectionNodes(measurement).map(toMeasurementItem));

      const pageInfo = connectionPageInfo(measurement);
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

export const defaultOptions = {
  staleTime: 60 * 1_000,
};

export function enabled(params: Params): boolean {
  return !!params.did;
}
