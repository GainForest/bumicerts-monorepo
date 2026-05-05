import {
  createGraphQLClient,
  graphql,
  type ResultOf,
} from "@/graphql/indexer";
import type { ConnectionNode } from "../_connection";

const actorProfileDocument = graphql(`
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
`);

const actorOrganizationDocument = graphql(`
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
          urls {
            label
            url
          }
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
`);

const certifiedLocationByUriDocument = graphql(`
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
`);

type ActorProfileNode = ConnectionNode<
  ResultOf<typeof actorProfileDocument>["appCertifiedActorProfile"]
>;
type ActorOrganizationNode = ConnectionNode<
  ResultOf<typeof actorOrganizationDocument>["appCertifiedActorOrganization"]
>;
type CertifiedLocationNode = NonNullable<
  ResultOf<typeof certifiedLocationByUriDocument>["appCertifiedLocationByUri"]
>;

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
  const response = await client.request(actorProfileDocument, { did });
  return getFirstNode(response.appCertifiedActorProfile);
}

export async function fetchActorOrganizationNodeByDid(
  did: string,
): Promise<ActorOrganizationNode | null> {
  const client = createGraphQLClient();
  const response = await client.request(actorOrganizationDocument, { did });
  return getFirstNode(response.appCertifiedActorOrganization);
}

export async function fetchCertifiedLocationNodeByAtUri(
  uri: string,
): Promise<CertifiedLocationNode | null> {
  const client = createGraphQLClient();
  const response = await client.request(certifiedLocationByUriDocument, { uri });
  return response.appCertifiedLocationByUri ?? null;
}
