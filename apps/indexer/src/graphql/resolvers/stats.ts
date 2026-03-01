/**
 * GraphQL query: collectionStats
 *
 * Returns the total number of indexed records per collection,
 * useful for dashboards and monitoring.
 *
 * Query shape:
 *   collectionStats { collection count }
 */

import { builder } from "../builder.ts";
import { CollectionStatType } from "../types.ts";
import { getCollectionStats } from "@/db/queries.ts";

builder.queryFields((t) => ({
  collectionStats: t.field({
    type: [CollectionStatType],
    description: "Total number of indexed records per lexicon collection.",
    resolve: () => getCollectionStats(),
  }),
}));
