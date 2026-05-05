import { createGraphQLClient } from "@/lib/graphql-dev/client";

type ActorProfileNode = {
  createdAt?: string | null;
  displayName?: string | null;
  description?: string | null;
  pronouns?: string | null;
  website?: string | null;
  avatar?: unknown;
  banner?: unknown;
};

type ActorProfileQueryResponse = {
  appCertifiedActorProfile?: {
    edges?: Array<{
      node?: ActorProfileNode | null;
    } | null> | null;
  } | null;
};

type ActorOrganizationNode = {
  createdAt?: string | null;
  organizationType?: string[] | null;
  urls?: unknown;
  location?: { uri?: string | null; cid?: string | null } | null;
  foundedDate?: string | null;
  longDescription?: unknown;
  visibility?: string | null;
};

type ActorOrganizationQueryResponse = {
  appCertifiedActorOrganization?: {
    edges?: Array<{
      node?: ActorOrganizationNode | null;
    } | null> | null;
  } | null;
};

type CertifiedLocationNode = {
  lpVersion?: string | null;
  srs?: string | null;
  locationType?: string | null;
  location?: unknown;
  name?: string | null;
  description?: string | null;
  createdAt?: string | null;
};

type CertifiedLocationByUriResponse = {
  appCertifiedLocationByUri?: CertifiedLocationNode | null;
};

const actorProfileDocument = /* GraphQL */ `
  query AccountActorProfile($did: String!) {
    appCertifiedActorProfile(
      where: { did: { eq: $did } }
      first: 1
      sortDirection: DESC
      sortBy: createdAt
    ) {
      edges {
        node {
          createdAt
          displayName
          description
          pronouns
          website
          avatar {
            __typename
            ... on OrgHypercertsDefsUri {
              uri
            }
            ... on OrgHypercertsDefsSmallImage {
              image {
                ref
                mimeType
                size
              }
            }
          }
          banner {
            __typename
            ... on OrgHypercertsDefsUri {
              uri
            }
            ... on OrgHypercertsDefsLargeImage {
              image {
                ref
                mimeType
                size
              }
            }
          }
        }
      }
    }
  }
`;

const actorOrganizationDocument = /* GraphQL */ `
  query AccountActorOrganization($did: String!) {
    appCertifiedActorOrganization(
      where: { did: { eq: $did } }
      first: 1
      sortDirection: DESC
      sortBy: createdAt
    ) {
      edges {
        node {
          createdAt
          organizationType
          urls
          location {
            uri
            cid
          }
          foundedDate
          longDescription {
            __typename
            ... on OrgHypercertsDefsDescriptionString {
              value
              facets {
                index {
                  byteStart
                  byteEnd
                }
                features {
                  ... on AppBskyRichtextFacetMention { did }
                  ... on AppBskyRichtextFacetLink { uri }
                  ... on AppBskyRichtextFacetTag { tag }
                }
              }
            }
            ... on ComAtprotoRepoStrongRef {
              uri
              cid
            }
            ... on PubLeafletPagesLinearDocument {
              id
              blocks {
                alignment
                block {
                  __typename
                  ... on PubLeafletBlocksText {
                    plaintext
                    facets {
                      index {
                        byteStart
                        byteEnd
                      }
                      features {
                        __typename
                        ... on PubLeafletRichtextFacetLink { uri }
                        ... on PubLeafletRichtextFacetDidMention { did }
                        ... on PubLeafletRichtextFacetAtMention { atURI href }
                        ... on PubLeafletRichtextFacetId { id }
                      }
                    }
                  }
                  ... on PubLeafletBlocksHeader {
                    plaintext
                    level
                    facets {
                      index {
                        byteStart
                        byteEnd
                      }
                      features {
                        __typename
                        ... on PubLeafletRichtextFacetLink { uri }
                        ... on PubLeafletRichtextFacetDidMention { did }
                        ... on PubLeafletRichtextFacetAtMention { atURI href }
                        ... on PubLeafletRichtextFacetId { id }
                      }
                    }
                  }
                  ... on PubLeafletBlocksImage {
                    alt
                    aspectRatio {
                      width
                      height
                    }
                    image {
                      ref
                      mimeType
                      size
                    }
                  }
                  ... on PubLeafletBlocksBlockquote {
                    plaintext
                    facets {
                      index {
                        byteStart
                        byteEnd
                      }
                      features {
                        __typename
                        ... on PubLeafletRichtextFacetLink { uri }
                        ... on PubLeafletRichtextFacetDidMention { did }
                        ... on PubLeafletRichtextFacetAtMention { atURI href }
                        ... on PubLeafletRichtextFacetId { id }
                      }
                    }
                  }
                  ... on PubLeafletBlocksUnorderedList {
                    children {
                      checked
                      content {
                        __typename
                        ... on PubLeafletBlocksText {
                          plaintext
                          facets {
                            index {
                              byteStart
                              byteEnd
                            }
                            features {
                              __typename
                              ... on PubLeafletRichtextFacetLink { uri }
                              ... on PubLeafletRichtextFacetDidMention { did }
                              ... on PubLeafletRichtextFacetAtMention { atURI href }
                              ... on PubLeafletRichtextFacetId { id }
                            }
                          }
                        }
                        ... on PubLeafletBlocksHeader {
                          plaintext
                          level
                          facets {
                            index {
                              byteStart
                              byteEnd
                            }
                            features {
                              __typename
                              ... on PubLeafletRichtextFacetLink { uri }
                              ... on PubLeafletRichtextFacetDidMention { did }
                              ... on PubLeafletRichtextFacetAtMention { atURI href }
                              ... on PubLeafletRichtextFacetId { id }
                            }
                          }
                        }
                        ... on PubLeafletBlocksImage {
                          alt
                          aspectRatio {
                            width
                            height
                          }
                          image {
                            ref
                            mimeType
                            size
                          }
                        }
                      }
                    }
                  }
                  ... on PubLeafletBlocksCode {
                    language
                    plaintext
                    syntaxHighlightingTheme
                  }
                  ... on PubLeafletBlocksHorizontalRule {
                    empty
                  }
                  ... on PubLeafletBlocksIframe {
                    url
                    height
                  }
                  ... on PubLeafletBlocksWebsite {
                    src
                    title
                    description
                  }
                }
              }
            }
          }
          visibility
        }
      }
    }
  }
`;

const certifiedLocationByUriDocument = /* GraphQL */ `
  query CertifiedLocationByUri($uri: String!) {
    appCertifiedLocationByUri(uri: $uri) {
      lpVersion
      srs
      locationType
      location {
        __typename
        ... on OrgHypercertsDefsUri {
          uri
        }
        ... on OrgHypercertsDefsSmallBlob {
          blob {
            ref
            mimeType
            size
          }
        }
        ... on AppCertifiedLocationString {
          string
        }
      }
      name
      description
      createdAt
    }
  }
`;

function getFirstNode<TNode>(
  connection:
    | {
        edges?: Array<{ node?: TNode | null } | null> | null;
      }
    | null
    | undefined,
): TNode | null {
  const firstEdge = connection?.edges?.[0];
  return firstEdge?.node ?? null;
}

export async function fetchActorProfileNodeByDid(
  did: string,
): Promise<ActorProfileNode | null> {
  const client = createGraphQLClient();
  const response = await client.request<ActorProfileQueryResponse>(
    actorProfileDocument,
    { did },
  );
  return getFirstNode(response.appCertifiedActorProfile);
}

export async function fetchActorOrganizationNodeByDid(
  did: string,
): Promise<ActorOrganizationNode | null> {
  const client = createGraphQLClient();
  const response = await client.request<ActorOrganizationQueryResponse>(
    actorOrganizationDocument,
    { did },
  );
  return getFirstNode(response.appCertifiedActorOrganization);
}

export async function fetchCertifiedLocationNodeByAtUri(
  uri: string,
): Promise<CertifiedLocationNode | null> {
  const client = createGraphQLClient();
  const response = await client.request<CertifiedLocationByUriResponse>(
    certifiedLocationByUriDocument,
    { uri },
  );
  return response.appCertifiedLocationByUri ?? null;
}
