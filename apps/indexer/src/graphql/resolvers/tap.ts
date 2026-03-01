/**
 * GraphQL mutations for Tap repo management.
 *
 * Mutations:
 *   addRepos(dids: [String!]!): Boolean!
 *     — Register DIDs with Tap (triggers backfill for each)
 *
 *   removeRepos(dids: [String!]!): Boolean!
 *     — Stop tracking DIDs in Tap
 */

import { builder } from "../builder.ts";
import { getTapContext } from "../tap-context.ts";

builder.mutationType({
  description: "Mutations for managing which AT Protocol repos Tap tracks.",
});

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
}));
