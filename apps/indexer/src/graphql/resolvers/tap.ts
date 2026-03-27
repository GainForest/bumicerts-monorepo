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
 */

import { builder } from "../builder.ts";
import { getTapContext } from "../tap-context.ts";
import { deleteRecordsByDids } from "@/db/queries.ts";
import { discoverDidsByCollection } from "@/tap/discovery.ts";

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
}));
