import { describe, expect, it } from "bun:test";
import type { Agent } from "@atproto/api";
import { Effect, Layer } from "effect";
import { AtprotoAgent } from "../../../services/AtprotoAgent";
import { appendExistingDwcDataset } from "../appendExisting";

const DID = "did:plc:testdatasetappend";
const DATASET_RKEY = "legacy-dataset";
const DATASET_URI = `at://${DID}/app.gainforest.dwc.dataset/${DATASET_RKEY}`;

type FakeAgentState = {
  datasetCid: string;
  datasetRecord: Record<string, unknown>;
  occurrenceRecords: Array<Record<string, unknown>>;
  putRecordCount: number;
};

function makeFakeAgent(options?: {
  initialRecordCount?: number;
  initialOccurrenceCount?: number;
}): {
  agent: Agent;
  state: FakeAgentState;
} {
  const initialOccurrenceCount = options?.initialOccurrenceCount ?? 0;
  const state: FakeAgentState = {
    datasetCid: "dataset-cid-0",
    datasetRecord: {
      $type: "app.gainforest.dwc.dataset",
      name: "Legacy dataset",
      createdAt: "2026-01-01T00:00:00.000Z",
      ...(options?.initialRecordCount != null
        ? { recordCount: options.initialRecordCount }
        : {}),
    },
    occurrenceRecords: Array.from({ length: initialOccurrenceCount }, (_, index) => ({
      $type: "app.gainforest.dwc.occurrence",
      scientificName: `Existing tree ${index + 1}`,
      eventDate: "2026-01-01",
      decimalLatitude: "1.1",
      decimalLongitude: "2.2",
      basisOfRecord: "HumanObservation",
      occurrenceID: `existing-occurrence-${index + 1}`,
      occurrenceStatus: "present",
      geodeticDatum: "EPSG:4326",
      license: "CC-BY-4.0",
      kingdom: "Plantae",
      datasetRef: DATASET_URI,
      dynamicProperties: JSON.stringify({
        dataType: "measuredTree",
        source: "bumicerts",
        datasetRef: DATASET_URI,
      }),
      createdAt: "2026-01-01T00:00:00.000Z",
    })),
    putRecordCount: 0,
  };

  const fakeAgent = {
    assertDid: DID,
    com: {
      atproto: {
        repo: {
          getRecord: async (input: { collection: string; rkey: string }) => {
            if (
              input.collection === "app.gainforest.dwc.dataset"
              && input.rkey === DATASET_RKEY
            ) {
              return {
                data: {
                  uri: DATASET_URI,
                  cid: state.datasetCid,
                  value: state.datasetRecord,
                },
              };
            }

            throw new Error(`Unexpected getRecord for ${input.collection}/${input.rkey}`);
          },
          createRecord: async (input: { collection: string; record: Record<string, unknown> }) => {
            if (input.collection !== "app.gainforest.dwc.occurrence") {
              throw new Error(`Unexpected createRecord for ${input.collection}`);
            }

            const nextIndex = state.occurrenceRecords.length + 1;
            state.occurrenceRecords.push(input.record);

            return {
              data: {
                uri: `at://${DID}/app.gainforest.dwc.occurrence/generated-${nextIndex}`,
                cid: `occurrence-cid-${nextIndex}`,
              },
            };
          },
          listRecords: async (input: { collection: string }) => {
            if (input.collection !== "app.gainforest.dwc.occurrence") {
              throw new Error(`Unexpected listRecords for ${input.collection}`);
            }

            return {
              data: {
                records: state.occurrenceRecords.map((record, index) => ({
                  uri: `at://${DID}/app.gainforest.dwc.occurrence/existing-${index + 1}`,
                  cid: `occurrence-cid-existing-${index + 1}`,
                  value: record,
                })),
                cursor: undefined,
              },
            };
          },
          putRecord: async (input: { collection: string; record: Record<string, unknown> }) => {
            if (input.collection !== "app.gainforest.dwc.dataset") {
              throw new Error(`Unexpected putRecord for ${input.collection}`);
            }

            state.datasetRecord = input.record;
            state.putRecordCount += 1;
            state.datasetCid = `dataset-cid-${state.putRecordCount}`;

            return {
              data: {
                uri: DATASET_URI,
                cid: state.datasetCid,
              },
            };
          },
        },
      },
    },
  };

  return {
    agent: fakeAgent as unknown as Agent,
    state,
  };
}

describe("appendExistingDwcDataset", () => {
  it("does not double-count when a legacy dataset is missing recordCount", async () => {
    const { agent, state } = makeFakeAgent({ initialOccurrenceCount: 1 });
    const layer = Layer.succeed(AtprotoAgent, agent);

    const result = await Effect.runPromise(
      appendExistingDwcDataset({
        datasetRkey: DATASET_RKEY,
        rows: [
          {
            occurrence: {
              scientificName: "Shorea leprosula",
              eventDate: "2026-02-01",
              decimalLatitude: "4.1234",
              decimalLongitude: "117.5678",
            },
            floraMeasurement: null,
          },
        ],
      }).pipe(Effect.provide(layer)),
    );

    expect(result.datasetUri).toBe(DATASET_URI);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.state).toBe("success");
    expect(state.putRecordCount).toBe(1);
    expect(state.occurrenceRecords).toHaveLength(2);
    expect(state.datasetRecord["recordCount"]).toBe(2);
  });
});
