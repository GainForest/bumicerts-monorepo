import type { TadaDocumentNode } from "gql.tada";
import { request } from "graphql-request";

type GraphQLHeaders = Record<string, string>;

export async function fetchGraphQL<ResponseType, VariablesType>(
  apiUrl: string,
  query: TadaDocumentNode<ResponseType, VariablesType>,
  variables?: VariablesType,
  headers?: GraphQLHeaders,
): Promise<ResponseType> {
  return request(apiUrl, query, variables ?? {}, headers);
}
