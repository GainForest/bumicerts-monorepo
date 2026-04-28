import { describe, expect, it } from "bun:test";
import type { Agent } from "@atproto/api";
import { Effect, Layer } from "effect";
import { makeCredentialAgentLayer } from "../../../layers/credential";
import { AtprotoAgent } from "../../../services/AtprotoAgent";
import { attachExistingDwcDatasetOccurrences } from "../attachExistingOccurrences";
import { DwcDatasetValidationError } from "../utils/errors";
import { ATTACH_EXISTING_DWC_DATASET_MAX_OCCURRENCES } from "../utils/types";

// ---------------------------------------------------------------------------
// Load test credentials from the package-level tests/.env.test-credentials.
// ---------------------------------------------------------------------------

await Bun.file(new URL("../../../../tests/.env.test-credentials", import.meta.url))
  .text()
  .then((text) => {
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      process.env[trimmed.slice(0, separatorIndex).trim()] = trimmed
        .slice(separatorIndex + 1)
        .trim();
    }
  })
  .catch(() => {});

const service = process.env["ATPROTO_SERVICE"] ?? "";
const identifier = process.env["ATPROTO_IDENTIFIER"] ?? "";
const password = process.env["ATPROTO_PASSWORD"] ?? "";
const credentialsProvided = service !== "" && identifier !== "" && password !== "";

const DID = "did:plc:testdatasetattach";
const DATASET_RKEY = "target-dataset";
const DATASET_URI = `at://${DID}/app.gainforest.dwc.dataset/${DATASET_RKEY}`;
const OTHER_DATASET_URI = `at://${DID}/app.gainforest.dwc.dataset/other-dataset`;

type StoredRecord = {
  uri: string;
  cid: string;
  value: Record<string, unknown>;
};

type FakeAgentState = {
  datasetCid: string;
  datasetRecord: Record<string, unknown>;
  occurrenceRecords: Map<string, StoredRecord>;
  datasetGetRecordCount: number;
  datasetPutRecordCount: number;
  occurrencePutRecordCount: number;
};

function makeOccurrenceRecord(options: {
  scientificName: string;
  datasetRef?: string;
}): Record<string, unknown> {
  return {
    $type: "app.gainforest.dwc.occurrence",
    scientificName: options.scientificName,
    eventDate: "2026-02-01",
    decimalLatitude: "4.1234",
    decimalLongitude: "117.5678",
    basisOfRecord: "HumanObservation",
    occurrenceID: `${options.scientificName.toLowerCase().replaceAll(" ", "-")}-1`,
    occurrenceStatus: "present",
    geodeticDatum: "EPSG:4326",
    license: "CC-BY-4.0",
    kingdom: "Plantae",
    ...(options.datasetRef ? { datasetRef: options.datasetRef } : {}),
    ...(options.datasetRef
      ? {
          dynamicProperties: JSON.stringify({
            dataType: "measuredTree",
            source: "bumicerts",
            datasetRef: options.datasetRef,
          }),
        }
      : {
          dynamicProperties: JSON.stringify({
            dataType: "measuredTree",
            source: "bumicerts",
          }),
        }),
    createdAt: "2026-02-01T00:00:00.000Z",
  };
}

function makeMissingRecordError(): Error & { status: number } {
  return Object.assign(new Error("Record not found"), { status: 404 });
}

function makeStoredOccurrence(
  rkey: string,
  value: Record<string, unknown>,
): StoredRecord {
  return {
    uri: `at://${DID}/app.gainforest.dwc.occurrence/${rkey}`,
    cid: `${rkey}-cid-0`,
    value,
  };
}

function makeFakeAgent(options?: {
  initialRecordCount?: number;
  occurrences?: Record<string, Record<string, unknown>>;
  deleteDatasetBeforeCountUpdate?: boolean;
  failDatasetCountUpdate?: boolean;
}): {
  agent: Agent;
  state: FakeAgentState;
} {
  const occurrenceEntries = Object.entries(options?.occurrences ?? {}).map(
    ([rkey, value]) => [rkey, makeStoredOccurrence(rkey, value)] as const,
  );
  const state: FakeAgentState = {
    datasetCid: "dataset-cid-0",
    datasetRecord: {
      $type: "app.gainforest.dwc.dataset",
      name: "Target dataset",
      createdAt: "2026-01-01T00:00:00.000Z",
      ...(options?.initialRecordCount != null
        ? { recordCount: options.initialRecordCount }
        : {}),
    },
    occurrenceRecords: new Map(occurrenceEntries),
    datasetGetRecordCount: 0,
    datasetPutRecordCount: 0,
    occurrencePutRecordCount: 0,
  };

  const fakeAgent = {
    assertDid: DID,
    com: {
      atproto: {
        repo: {
          getRecord: async (input: { collection: string; rkey: string }) => {
            if (input.collection === "app.gainforest.dwc.dataset") {
              if (input.rkey !== DATASET_RKEY) {
                throw makeMissingRecordError();
              }

              state.datasetGetRecordCount += 1;
              if (
                options?.deleteDatasetBeforeCountUpdate === true &&
                state.datasetGetRecordCount > 1
              ) {
                throw makeMissingRecordError();
              }

              return {
                data: {
                  uri: DATASET_URI,
                  cid: state.datasetCid,
                  value: state.datasetRecord,
                },
              };
            }

            if (input.collection === "app.gainforest.dwc.occurrence") {
              const record = state.occurrenceRecords.get(input.rkey);
              if (!record) {
                throw makeMissingRecordError();
              }

              return {
                data: {
                  uri: record.uri,
                  cid: record.cid,
                  value: record.value,
                },
              };
            }

            throw new Error(`Unexpected getRecord for ${input.collection}`);
          },
          listRecords: async (input: { collection: string }) => {
            if (input.collection !== "app.gainforest.dwc.occurrence") {
              throw new Error(`Unexpected listRecords for ${input.collection}`);
            }

            return {
              data: {
                records: Array.from(state.occurrenceRecords.values()).map(
                  (record) => ({
                    uri: record.uri,
                    cid: record.cid,
                    value: record.value,
                  }),
                ),
                cursor: undefined,
              },
            };
          },
          putRecord: async (input: {
            collection: string;
            rkey: string;
            swapRecord?: string | null;
            record: Record<string, unknown>;
          }) => {
            if (input.collection === "app.gainforest.dwc.dataset") {
              if (input.swapRecord !== state.datasetCid) {
                throw new Error("Dataset putRecord did not use the current CID.");
              }

              if (options?.failDatasetCountUpdate === true) {
                throw new Error("Dataset count update failed.");
              }

              state.datasetRecord = input.record;
              state.datasetPutRecordCount += 1;
              state.datasetCid = `dataset-cid-${state.datasetPutRecordCount}`;

              return {
                data: {
                  uri: DATASET_URI,
                  cid: state.datasetCid,
                },
              };
            }

            if (input.collection === "app.gainforest.dwc.occurrence") {
              const existing = state.occurrenceRecords.get(input.rkey);
              if (!existing) {
                throw makeMissingRecordError();
              }

              if (input.swapRecord !== existing.cid) {
                throw new Error("Occurrence putRecord did not use the current CID.");
              }

              state.occurrencePutRecordCount += 1;
              state.occurrenceRecords.set(input.rkey, {
                uri: existing.uri,
                cid: `${input.rkey}-cid-${state.occurrencePutRecordCount}`,
                value: input.record,
              });

              return {
                data: {
                  uri: existing.uri,
                  cid: `${input.rkey}-cid-${state.occurrencePutRecordCount}`,
                },
              };
            }

            throw new Error(`Unexpected putRecord for ${input.collection}`);
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

async function runAttach(options: {
  agent: Agent;
  occurrenceRkeys: string[];
}) {
  const layer = Layer.succeed(AtprotoAgent, options.agent);

  return Effect.runPromise(
    attachExistingDwcDatasetOccurrences({
      datasetRkey: DATASET_RKEY,
      occurrenceRkeys: options.occurrenceRkeys,
    }).pipe(Effect.provide(layer)),
  );
}

async function runAttachInput(options: {
  agent: Agent;
  datasetRkey: string;
  occurrenceRkeys: string[];
}) {
  const layer = Layer.succeed(AtprotoAgent, options.agent);

  return Effect.runPromise(
    attachExistingDwcDatasetOccurrences({
      datasetRkey: options.datasetRkey,
      occurrenceRkeys: options.occurrenceRkeys,
    }).pipe(Effect.provide(layer)),
  );
}

describe("attachExistingDwcDatasetOccurrences", () => {
  it("loads test credentials through the credential layer when available", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set.");
      return;
    }

    const layer = makeCredentialAgentLayer({ service, identifier, password });

    const result = await Effect.runPromise(
      attachExistingDwcDatasetOccurrences({
        datasetRkey: " ",
        occurrenceRkeys: ["tree-1"],
      }).pipe(Effect.either, Effect.provide(layer)),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(DwcDatasetValidationError);
    }
  });

  it("attaches an ungrouped occurrence and increments dataset count", async () => {
    const { agent, state } = makeFakeAgent({
      initialRecordCount: 0,
      occurrences: {
        "tree-1": makeOccurrenceRecord({ scientificName: "Shorea leprosula" }),
      },
    });

    const result = await runAttach({ agent, occurrenceRkeys: ["tree-1"] });

    expect(result.datasetUri).toBe(DATASET_URI);
    expect(result.attachedCount).toBe(1);
    expect(result.results[0]?.state).toBe("success");
    expect(state.datasetRecord["recordCount"]).toBe(1);
    expect(state.datasetPutRecordCount).toBe(1);
    expect(state.occurrencePutRecordCount).toBe(1);

    const treeRecord = state.occurrenceRecords.get("tree-1");
    expect(treeRecord).toBeDefined();
    if (!treeRecord) {
      throw new Error("Expected tree-1 to be stored.");
    }

    expect(treeRecord.value["datasetRef"]).toBe(DATASET_URI);
    expect(treeRecord.value["dynamicProperties"]).toBe(
      JSON.stringify({
        dataType: "measuredTree",
        source: "bumicerts",
        datasetRef: DATASET_URI,
      }),
    );
  });

  it("preserves existing dynamicProperties when attaching", async () => {
    const tree = makeOccurrenceRecord({ scientificName: "Shorea leprosula" });
    tree["dynamicProperties"] = JSON.stringify({
      dataType: "measuredTree",
      source: "bumicerts",
      canopyCondition: "healthy",
    });
    const { agent, state } = makeFakeAgent({
      initialRecordCount: 0,
      occurrences: {
        "tree-1": tree,
      },
    });

    await runAttach({ agent, occurrenceRkeys: ["tree-1"] });

    const treeRecord = state.occurrenceRecords.get("tree-1");
    expect(treeRecord).toBeDefined();
    if (!treeRecord) {
      throw new Error("Expected tree-1 to be stored.");
    }

    expect(treeRecord.value["dynamicProperties"]).toBe(
      JSON.stringify({
        dataType: "measuredTree",
        source: "bumicerts",
        canopyCondition: "healthy",
        datasetRef: DATASET_URI,
      }),
    );
  });

  it("preserves non-JSON dynamicProperties values", async () => {
    const tree = makeOccurrenceRecord({ scientificName: "Shorea leprosula" });
    tree["dynamicProperties"] = "legacy free-text dynamic properties";
    const { agent, state } = makeFakeAgent({
      initialRecordCount: 0,
      occurrences: {
        "tree-1": tree,
      },
    });

    await runAttach({ agent, occurrenceRkeys: ["tree-1"] });

    const treeRecord = state.occurrenceRecords.get("tree-1");
    expect(treeRecord).toBeDefined();
    if (!treeRecord) {
      throw new Error("Expected tree-1 to be stored.");
    }

    expect(treeRecord.value["datasetRef"]).toBe(DATASET_URI);
    expect(treeRecord.value["dynamicProperties"]).toBe(
      "legacy free-text dynamic properties",
    );
  });

  it("moves attached occurrences back to the review bucket if the dataset disappears", async () => {
    const { agent, state } = makeFakeAgent({
      initialRecordCount: 0,
      deleteDatasetBeforeCountUpdate: true,
      occurrences: {
        "tree-1": makeOccurrenceRecord({ scientificName: "Shorea leprosula" }),
      },
    });

    const result = await runAttach({ agent, occurrenceRkeys: ["tree-1"] });

    expect(result.attachedCount).toBe(0);
    expect(result.errorCount).toBe(1);
    expect(result.datasetBecameUnavailable).toBe(true);
    expect(result.results[0]?.state).toBe("error");
    expect(state.datasetPutRecordCount).toBe(0);
    expect(state.occurrencePutRecordCount).toBe(2);

    const treeRecord = state.occurrenceRecords.get("tree-1");
    expect(treeRecord).toBeDefined();
    if (!treeRecord) {
      throw new Error("Expected tree-1 to be stored.");
    }

    expect(treeRecord.value["datasetRef"]).toBeUndefined();
    expect(treeRecord.value["dynamicProperties"]).toBe(
      JSON.stringify({
        dataType: "measuredTree",
        source: "bumicerts",
      }),
    );
  });

  it("keeps successful attachments when a non-404 count update fails", async () => {
    const { agent, state } = makeFakeAgent({
      initialRecordCount: 0,
      failDatasetCountUpdate: true,
      occurrences: {
        "tree-1": makeOccurrenceRecord({ scientificName: "Shorea leprosula" }),
      },
    });

    const result = await runAttach({ agent, occurrenceRkeys: ["tree-1"] });

    expect(result.attachedCount).toBe(1);
    expect(result.datasetCountUpdated).toBe(false);
    expect(result.datasetBecameUnavailable).toBe(false);
    expect(result.datasetCountError).toBe("Failed to update dataset tree count.");

    const treeRecord = state.occurrenceRecords.get("tree-1");
    expect(treeRecord).toBeDefined();
    if (!treeRecord) {
      throw new Error("Expected tree-1 to be stored.");
    }

    expect(treeRecord.value["datasetRef"]).toBe(DATASET_URI);
    expect(state.occurrencePutRecordCount).toBe(1);
  });

  it("skips occurrences that are already grouped", async () => {
    const { agent, state } = makeFakeAgent({
      initialRecordCount: 1,
      occurrences: {
        "tree-1": makeOccurrenceRecord({
          scientificName: "Shorea leprosula",
          datasetRef: OTHER_DATASET_URI,
        }),
        "tree-2": makeOccurrenceRecord({
          scientificName: "Dipterocarpus grandiflorus",
          datasetRef: DATASET_URI,
        }),
      },
    });

    const result = await runAttach({
      agent,
      occurrenceRkeys: ["tree-1", "tree-2"],
    });

    expect(result.attachedCount).toBe(0);
    expect(result.skippedCount).toBe(2);
    expect(result.datasetCountUpdated).toBe(true);
    expect(state.datasetRecord["recordCount"]).toBe(1);
    expect(state.datasetPutRecordCount).toBe(0);
    expect(state.occurrencePutRecordCount).toBe(0);
  });

  it("recounts legacy datasets missing recordCount after attaching", async () => {
    const { agent, state } = makeFakeAgent({
      occurrences: {
        "tree-1": makeOccurrenceRecord({
          scientificName: "Existing dataset tree",
          datasetRef: DATASET_URI,
        }),
        "tree-2": makeOccurrenceRecord({ scientificName: "Ungrouped tree" }),
      },
    });

    const result = await runAttach({ agent, occurrenceRkeys: ["tree-2"] });

    expect(result.attachedCount).toBe(1);
    expect(state.datasetRecord["recordCount"]).toBe(2);
    expect(state.datasetPutRecordCount).toBe(1);
  });

  it("continues when one occurrence cannot be found", async () => {
    const { agent, state } = makeFakeAgent({
      initialRecordCount: 0,
      occurrences: {
        "tree-1": makeOccurrenceRecord({ scientificName: "Shorea leprosula" }),
      },
    });

    const result = await runAttach({
      agent,
      occurrenceRkeys: ["missing-tree", "tree-1"],
    });

    expect(result.attachedCount).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.results[0]?.state).toBe("error");
    expect(result.results[1]?.state).toBe("success");
    expect(state.datasetRecord["recordCount"]).toBe(1);
  });

  it("rejects invalid input boundaries", async () => {
    const { agent } = makeFakeAgent();
    const tooManyRkeys = Array.from(
      { length: ATTACH_EXISTING_DWC_DATASET_MAX_OCCURRENCES + 1 },
      (_, index) => `tree-${index}`,
    );

    await expect(
      runAttachInput({
        agent,
        datasetRkey: " ",
        occurrenceRkeys: ["tree-1"],
      }),
    ).rejects.toThrow();
    await expect(
      runAttachInput({
        agent,
        datasetRkey: DATASET_RKEY,
        occurrenceRkeys: [],
      }),
    ).rejects.toThrow();
    await expect(
      runAttachInput({
        agent,
        datasetRkey: DATASET_RKEY,
        occurrenceRkeys: ["tree-1", " "],
      }),
    ).rejects.toThrow();
    await expect(
      runAttachInput({
        agent,
        datasetRkey: DATASET_RKEY,
        occurrenceRkeys: tooManyRkeys,
      }),
    ).rejects.toThrow();
  });
});
