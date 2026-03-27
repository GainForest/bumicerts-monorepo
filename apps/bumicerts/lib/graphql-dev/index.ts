/**
 * GraphQL module exports
 *
 * This module provides everything needed for querying the indexer:
 * - graphqlClient: The configured GraphQL client
 * - graphql: gql.tada's typed query builder
 * - Type utilities: ResultOf, VariablesOf, FragmentOf
 *
 * @example
 * ```ts
 * import { graphqlClient, graphql, type ResultOf } from "@/lib/graphql";
 *
 * const MyQuery = graphql(`
 *   query GetOrganizations($limit: Int) {
 *     gainforest {
 *       organization {
 *         infos(limit: $limit) {
 *           records {
 *             meta { did }
 *             displayName
 *           }
 *           pageInfo { endCursor hasNextPage }
 *         }
 *       }
 *     }
 *   }
 * `);
 *
 * type QueryResult = ResultOf<typeof MyQuery>;
 *
 * const data = await graphqlClient.request(MyQuery, { limit: 10 });
 * ```
 */

export { graphqlClient, createGraphQLClient, INDEXER_URL } from "./client";
export { graphql, type FragmentOf, type ResultOf, type VariablesOf } from "./tada";
