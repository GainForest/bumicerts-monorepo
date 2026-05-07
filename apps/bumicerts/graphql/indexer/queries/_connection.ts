export type GraphQLConnectionLike = {
  edges?: ReadonlyArray<unknown> | null;
  pageInfo?: {
    endCursor?: string | null;
    hasNextPage?: boolean | null;
  } | null;
  totalCount?: number | null;
} | null | undefined;

type ConnectionEdge<TConnection extends GraphQLConnectionLike> = NonNullable<
  NonNullable<NonNullable<TConnection>["edges"]>[number]
>;

export type ConnectionNode<TConnection extends GraphQLConnectionLike> = NonNullable<
  ConnectionEdge<TConnection> extends { node?: infer TNode } ? TNode : never
>;
