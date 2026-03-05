/**
 * gql.tada GraphQL setup
 *
 * This module provides the typed `graphql` function for writing
 * type-safe GraphQL queries against the indexer schema.
 *
 * @example
 * ```ts
 * import { graphql } from "@/lib/graphql/tada";
 *
 * const MyQuery = graphql(`
 *   query GetOrganizations {
 *     gainforest {
 *       organization {
 *         infos {
 *           records {
 *             meta { did uri }
 *             displayName
 *           }
 *         }
 *       }
 *     }
 *   }
 * `);
 *
 * // Type is automatically inferred from the query
 * type MyQueryResult = ResultOf<typeof MyQuery>;
 * ```
 */

import { initGraphQLTada } from "gql.tada";
import type { introspection } from "@/graphql/graphql-env";

export const graphql = initGraphQLTada<{
  introspection: introspection;
  scalars: {
    DateTime: string;
    JSON: unknown;
  };
}>();

// Re-export useful types
export type { FragmentOf, ResultOf, VariablesOf } from "gql.tada";
