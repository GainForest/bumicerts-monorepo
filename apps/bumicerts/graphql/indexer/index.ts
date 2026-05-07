import {
  GraphQLClient,
  type RequestMiddleware,
  type ResponseMiddleware,
} from "graphql-request";
import { initGraphQLTada, readFragment } from "gql.tada";
import { fetchGraphQL } from "@/graphql";
import type { introspection } from "./env";
import { clientEnv as env } from "@/lib/env/client";

const defaultHeaders = {
  "ngrok-skip-browser-warning": "true",
} satisfies Record<string, string>;

type IndexerGraphQLErrorPolicy = "none" | "ignore" | "all";

type IndexerGraphQLClientOptions = {
  headers?: Record<string, string>;
  errorPolicy?: IndexerGraphQLErrorPolicy;
  requestMiddleware?: RequestMiddleware;
  responseMiddleware?: ResponseMiddleware;
};

export const INDEXER_URL = env.NEXT_PUBLIC_INDEXER_URL;

export const graphql = initGraphQLTada<{
  introspection: introspection;
  scalars: {
    DateTime: string;
    JSON: unknown;
  };
}>();

export function createIndexerGraphQLClient(
  options?: IndexerGraphQLClientOptions,
) {
  const headers = options?.headers;

  return new GraphQLClient(INDEXER_URL, {
    errorPolicy: options?.errorPolicy,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    requestMiddleware: options?.requestMiddleware,
    responseMiddleware: options?.responseMiddleware,
  });
}

export const indexerGraphQLClient = createIndexerGraphQLClient();
export const graphqlClient = indexerGraphQLClient;
export const createGraphQLClient = createIndexerGraphQLClient;

export async function fetchIndexerGraphQL<ResponseType, VariablesType>(
  query: Parameters<typeof fetchGraphQL<ResponseType, VariablesType>>[1],
  variables?: VariablesType,
  headers?: Record<string, string>,
): Promise<ResponseType> {
  return fetchGraphQL(
    INDEXER_URL,
    query,
    variables,
    headers
      ? {
          ...defaultHeaders,
          ...headers,
        }
      : defaultHeaders,
  );
}

export { readFragment };
export type { FragmentOf, ResultOf, VariablesOf } from "gql.tada";
