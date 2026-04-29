/**
 * GraphQL mutations for Tap repo management.
 *
 * Mutations:
 *   addRepos(dids: [String!]!): Boolean!
 *     — Register DIDs with Tap (triggers backfill for each)
 *
 *   removeRepos(dids: [String!]!): Boolean!
 *     — Stop tracking DIDs in Tap
 *
 *   reindexRepoByDid(dids: [String!]!): Int!
 *     — Wipe all DB records for the given DIDs, reset Tap cursor, re-backfill
 *
 *   reindexRepoByCollection(collection: String!): Int!
 *     — Discover all DIDs for a collection via the relay, then reindex each
 *
 *   backfillWindowByCollections(startIso, endIso, collections?): Int!
 *     — Discover DIDs via relay collections, probe for records in a time window,
 *       then force Tap-native backfill (remove + add) for matched DIDs.
 */

import { builder } from "../builder.ts";
import { getTapContext } from "../tap-context.ts";
import { deleteRecordsByDids } from "@/db/queries.ts";
import { discoverDidsByCollection, discoverDidsByCollections } from "@/tap/discovery.ts";
import { INDEXED_COLLECTIONS } from "@/tap/collections.ts";
import { getPdsHost } from "@/identity/pds.ts";

builder.mutationType({
  description: "Mutations for managing which AT Protocol repos Tap tracks.",
});

/**
 * Core reindex logic for a list of DIDs:
 * 1. Delete all existing DB records for those DIDs
 * 2. Remove from Tap (resets its cursor)
 * 3. Re-add to Tap (triggers fresh backfill from PDS)
 */
async function reindexDids(dids: string[]): Promise<number> {
  if (dids.length === 0) return 0;
  const tap = getTapContext();
  await Promise.all([
    deleteRecordsByDids(dids),
    tap.removeRepos(dids),
  ]);
  await tap.addRepos(dids);
  return dids.length;
}

async function backfillDids(dids: string[]): Promise<number> {
  if (dids.length === 0) return 0;
  const tap = getTapContext();
  const BATCH_SIZE = 200;

  for (let i = 0; i < dids.length; i += BATCH_SIZE) {
    const batch = dids.slice(i, i + BATCH_SIZE);
    await tap.removeRepos(batch);
    await tap.addRepos(batch);

    // Small pause to avoid overwhelming Tap on very large runs.
    if (i + BATCH_SIZE < dids.length) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return dids.length;
}

interface ListRecordsResponse {
  cursor?: string;
  records?: Array<{
    value?: {
      createdAt?: string;
    };
  }>;
}

function toEpochMs(iso: string, field: "startIso" | "endIso"): number {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    throw new Error(`${field} must be a valid ISO datetime string`);
  }
  return ms;
}

async function didHasRecordsInWindow(
  did: string,
  collections: string[],
  startMs: number,
  endMs: number,
  maxPagesPerCollection: number,
): Promise<boolean> {
  const LIST_RECORDS_LIMIT = 100;

  const host = await getPdsHost(did);
  if (!host || host === "https://unknown.invalid") return false;

  const base = host.replace(/\/+$/, "");

  for (const collection of collections) {
    let cursor: string | undefined;
    let pages = 0;

    do {
      const params = new URLSearchParams({
        repo: did,
        collection,
        reverse: "true",
        limit: String(LIST_RECORDS_LIMIT),
      });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(
        `${base}/xrpc/com.atproto.repo.listRecords?${params.toString()}`,
        { signal: AbortSignal.timeout(20_000) },
      );

      // If one PDS/collection request fails, skip it and continue scanning others.
      if (!res.ok) break;

      const body = (await res.json()) as ListRecordsResponse;
      const records = body.records ?? [];

      for (const rec of records) {
        const createdAt = rec?.value?.createdAt;
        if (!createdAt) continue;
        const createdMs = Date.parse(createdAt);
        if (!Number.isFinite(createdMs)) continue;
        if (createdMs >= startMs && createdMs <= endMs) return true;
      }

      cursor = body.cursor;
      pages++;
    } while (cursor && pages < maxPagesPerCollection);
  }

  return false;
}

async function filterDidsByWindow(
  dids: string[],
  collections: string[],
  startMs: number,
  endMs: number,
  maxPagesPerCollection: number,
): Promise<string[]> {
  const matched: string[] = [];
  const CONCURRENCY = 20;

  for (let i = 0; i < dids.length; i += CONCURRENCY) {
    const batch = dids.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (did) => {
        try {
          const hasMatch = await didHasRecordsInWindow(
            did,
            collections,
            startMs,
            endMs,
            maxPagesPerCollection,
          );
          return hasMatch ? did : null;
        } catch {
          return null;
        }
      }),
    );

    for (const did of results) {
      if (did) matched.push(did);
    }
  }

  return matched;
}

builder.mutationFields((t) => ({
  addRepos: t.boolean({
    description: "Register DIDs with Tap for tracking and backfill.",
    args: {
      dids: t.arg.stringList({ required: true, description: "List of DIDs to add" }),
    },
    resolve: async (_root, args) => {
      await getTapContext().addRepos(args.dids);
      return true;
    },
  }),

  removeRepos: t.boolean({
    description: "Stop tracking DIDs in Tap.",
    args: {
      dids: t.arg.stringList({ required: true, description: "List of DIDs to remove" }),
    },
    resolve: async (_root, args) => {
      await getTapContext().removeRepos(args.dids);
      return true;
    },
  }),

  reindexRepoByDid: t.int({
    description:
      "Wipe all indexed records for the given DIDs, reset their Tap cursor, and trigger a fresh backfill from the PDS. Returns the number of DIDs reindexed.",
    args: {
      dids: t.arg.stringList({ required: true, description: "List of DIDs to reindex" }),
    },
    resolve: async (_root, args) => reindexDids(args.dids),
  }),

  reindexRepoByCollection: t.int({
    description:
      "Discover all DIDs that have records for the given collection NSID via the relay, then wipe and re-backfill each. Returns the number of DIDs reindexed.",
    args: {
      collection: t.arg.string({ required: true, description: "Collection NSID to reindex (e.g. org.hypercerts.claim.activity)" }),
    },
    resolve: async (_root, args) => {
      const tap = getTapContext();
      const dids = await discoverDidsByCollection(
        tap.getDiscoveryRelayUrl(),
        args.collection,
      );
      return reindexDids(dids);
    },
  }),

  backfillWindowByCollections: t.int({
    description:
      "Discover DIDs via relay collections, probe repos for records created in [startIso, endIso], then force Tap-native backfill (remove + add) for matched DIDs. Returns number of DIDs backfilled (or matched in dryRun).",
    args: {
      startIso: t.arg.string({ required: true, description: "Window start (ISO datetime)", }),
      endIso: t.arg.string({ required: true, description: "Window end (ISO datetime)", }),
      collections: t.arg.stringList({ required: false, description: "Optional collection NSIDs to scope discovery. Defaults to all indexed collections.", }),
      dryRun: t.arg.boolean({ required: false, description: "If true, do not trigger Tap backfill; only return matched DID count.", }),
      maxDids: t.arg.int({ required: false, description: "Maximum number of discovered DIDs to scan (safety cap). Default: 2000.", }),
      maxPagesPerCollection: t.arg.int({ required: false, description: "Max listRecords pages to scan per DID+collection while probing the window. Default: 15.", }),
    },
    resolve: async (_root, args) => {
      const startMs = toEpochMs(args.startIso, "startIso");
      const endMs = toEpochMs(args.endIso, "endIso");
      if (endMs < startMs) {
        throw new Error("endIso must be greater than or equal to startIso");
      }

      const collections =
        args.collections && args.collections.length > 0
          ? [...new Set(args.collections)]
          : [...INDEXED_COLLECTIONS];

      const tap = getTapContext();
      const discovered = await discoverDidsByCollections(
        tap.getDiscoveryRelayUrl(),
        collections,
      );

      const cap = Math.max(1, args.maxDids ?? 2000);
      const cappedDids = discovered.slice(0, cap);
      const maxPagesPerCollection = Math.max(1, args.maxPagesPerCollection ?? 15);

      const matched = await filterDidsByWindow(
        cappedDids,
        collections,
        startMs,
        endMs,
        maxPagesPerCollection,
      );

      if (args.dryRun) return matched.length;
      return backfillDids(matched);
    },
  }),
}));
