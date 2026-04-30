/**
 * linkEvm query module.
 *
 * Scratch migration target:
 *   appGainforestLinkEvm(...) { edges { node { ... } } }
 */

import { GraphQLClient } from "graphql-request";
import { verifyTypedData, verifyMessage } from "viem";
import type { ConnectionResult } from "../_migration-helpers";
import { pluckConnectionNodes } from "../_migration-helpers";

const graphqlClient = new GraphQLClient(process.env.NEXT_PUBLIC_INDEXER_URL ?? "", {
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

const byDidDocument = /* GraphQL */ `
  query LinkEvmByDid($did: String!, $first: Int) {
    appGainforestLinkEvm(
      where: { did: { eq: $did } }
      first: $first
      sortDirection: DESC
      sortBy: createdAt
    ) {
      edges {
        node {
          uri
          rkey
          did
          cid
          createdAt
          name
          address
          userProof {
            __typename
            ... on AppGainforestLinkEvmEip712Proof {
              signature
              message {
                did
                evmAddress
                chainId
                timestamp
                nonce
              }
            }
          }
          platformAttestation {
            __typename
            ... on AppGainforestLinkEvmEip712PlatformAttestation {
              platformAddress
              signature
              signedData
            }
          }
        }
      }
    }
  }
`;

const EIP712_DOMAIN = {
  name: "ATProto EVM Attestation",
  version: "1",
} as const;

const EIP712_TYPES = {
  AttestLink: [
    { name: "did", type: "string" },
    { name: "evmAddress", type: "string" },
    { name: "chainId", type: "string" },
    { name: "timestamp", type: "string" },
    { name: "nonce", type: "string" },
  ],
} as const;

type LinkMessage = {
  did: string | null;
  evmAddress: string | null;
  chainId: string | null;
  timestamp: string | null;
  nonce: string | null;
};

type LinkUserProof = {
  __typename: string;
  signature?: string | null;
  message?: LinkMessage | null;
} | null;

type LinkPlatformAttestation = {
  __typename: string;
  platformAddress?: string | null;
  signature?: string | null;
  signedData?: string | null;
} | null;

type LinkNode = {
  uri: string;
  rkey: string;
  did: string;
  cid: string;
  createdAt: string;
  name: string | null;
  address: string | null;
  userProof: LinkUserProof;
  platformAttestation: LinkPlatformAttestation;
};

type LinkResponse = {
  appGainforestLinkEvm?: ConnectionResult<LinkNode> | null;
};

export type EvmLink = {
  metadata: {
    uri: string | null;
    rkey: string | null;
    did: string | null;
    cid: string | null;
    createdAt: string | null;
  } | null;
  specialMetadata: {
    valid: boolean | null;
  } | null;
  record: {
    name: string | null;
    address: string | null;
    platformAttestation: {
      platformAddress: string | null;
    } | null;
  } | null;
};

export type Params = { did: string };

async function verifyUserProof(address: string, userProof: NonNullable<LinkUserProof>): Promise<boolean> {
  const message = userProof.message;

  if (!userProof.signature || !message) {
    return false;
  }

  return verifyTypedData({
    address: address as `0x${string}`,
    domain: EIP712_DOMAIN,
    types: EIP712_TYPES,
    primaryType: "AttestLink",
    message: {
      did: message.did ?? "",
      evmAddress: message.evmAddress ?? "",
      chainId: message.chainId ?? "",
      timestamp: message.timestamp ?? "",
      nonce: message.nonce ?? "",
    },
    signature: userProof.signature as `0x${string}`,
  }).catch(() => false);
}

async function verifyPlatformAttestation(attestation: NonNullable<LinkPlatformAttestation>): Promise<boolean> {
  if (!attestation.platformAddress || !attestation.signature || !attestation.signedData) {
    return false;
  }

  return verifyMessage({
    address: attestation.platformAddress as `0x${string}`,
    message: { raw: attestation.signedData as `0x${string}` },
    signature: attestation.signature as `0x${string}`,
  }).catch(() => false);
}

async function computeValid(node: LinkNode): Promise<boolean> {
  if (!node.address) {
    return false;
  }

  const userProof = node.userProof;
  if (!userProof) {
    return false;
  }

  if (userProof.__typename !== "AppGainforestLinkEvmEip712Proof") {
    return false;
  }

  const userProofOk = await verifyUserProof(node.address, userProof);
  if (!userProofOk) {
    return false;
  }

  const platformAttestation = node.platformAttestation;
  if (!platformAttestation) {
    return false;
  }

  if (platformAttestation.__typename !== "AppGainforestLinkEvmEip712PlatformAttestation") {
    return false;
  }

  return verifyPlatformAttestation(platformAttestation);
}

async function normalizeLink(node: LinkNode): Promise<EvmLink> {
  return {
    metadata: {
      uri: node.uri,
      rkey: node.rkey,
      did: node.did,
      cid: node.cid,
      createdAt: node.createdAt,
    },
    specialMetadata: {
      valid: await computeValid(node),
    },
    record: {
      name: node.name,
      address: node.address,
      platformAttestation: node.platformAttestation?.__typename === "AppGainforestLinkEvmEip712PlatformAttestation"
        ? { platformAddress: node.platformAttestation.platformAddress ?? null }
        : null,
    },
  };
}

export async function fetch(params: Params): Promise<EvmLink[]> {
  const res = await graphqlClient.request<LinkResponse>(byDidDocument, {
    did: params.did,
    first: 20,
  });

  return Promise.all(pluckConnectionNodes(res.appGainforestLinkEvm).map((node) => normalizeLink(node)));
}

export async function fetchVerifiedAddress(did: string): Promise<string | null> {
  const links = await fetch({ did });

  const verified = links.find((link) => {
    return link.specialMetadata?.valid === true;
  });

  return verified?.record?.address ?? null;
}

export const fetchLinkEvm = (did: string) => fetch({ did });

export const defaultOptions = {
  staleTime: 30 * 1_000,
  retry: false,
};

export function enabled(params: Params): boolean {
  return !!params.did;
}
