/**
 * cartBumicert query module.
 *
 * Scratch migration target:
 *   orgHypercertsClaimActivity + appGainforestFundingConfigByUri + appGainforestOrganizationInfo
 */

import { graphqlClient } from "@/lib/graphql-dev/client";
import type { QueryModule } from "@/lib/graphql-dev/create-query";
import type { FundingConfigData } from "@/lib/types";
import type { ConnectionResult } from "../_migration-helpers";
import { pluckConnectionNodes } from "../_migration-helpers";

const activityDocument = /* GraphQL */ `
  query CartBumicertActivity($uri: String!) {
    orgHypercertsClaimActivityByUri(uri: $uri) {
      did
      rkey
      title
    }
  }
`;

const orgDocument = /* GraphQL */ `
  query CartBumicertOrg($did: String!) {
    appGainforestOrganizationInfo(where: { did: { eq: $did } }, first: 1) {
      edges {
        node {
          displayName
        }
      }
    }
  }
`;

const fundingConfigDocument = /* GraphQL */ `
  query CartBumicertFundingConfig($uri: String!) {
    appGainforestFundingConfigByUri(uri: $uri) {
      receivingWallet {
        ... on AppGainforestFundingConfigEvmLinkRef {
          uri
        }
      }
      status
      goalInUSD
      minDonationInUSD
      maxDonationInUSD
      allowOversell
      createdAt
      updatedAt
    }
  }
`;

type ActivityNode = { did: string; rkey: string; title: string };
type OrgNode = { displayName: string };

type ActivityResponse = {
  orgHypercertsClaimActivityByUri?: ActivityNode | null;
};

type OrgResponse = {
  appGainforestOrganizationInfo?: ConnectionResult<OrgNode> | null;
};

type FundingConfigResponse = {
  appGainforestFundingConfigByUri?: {
    receivingWallet?: { uri?: string | null } | null;
    status?: FundingConfigData["status"];
    goalInUSD?: string | null;
    minDonationInUSD?: string | null;
    maxDonationInUSD?: string | null;
    allowOversell?: boolean | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  } | null;
};

export type Params = { id: string };

export type CartBumicertItem = {
  id: string;
  rkey: string;
  organizationDid: string;
  title: string;
  organizationName: string;
  fundingConfig: Pick<FundingConfigData, "receivingWallet" | "status"> | null;
};

function buildFundingConfigUri(did: string, rkey: string): string {
  return `at://${did}/app.gainforest.funding.config/${rkey}`;
}

function buildActivityUri(did: string, rkey: string): string {
  return `at://${did}/org.hypercerts.claim.activity/${rkey}`;
}

export async function fetch(params: Params): Promise<CartBumicertItem | null> {
  const firstDash = params.id.indexOf("-");
  if (firstDash === -1) return null;

  const did = params.id.slice(0, firstDash);
  const rkey = params.id.slice(firstDash + 1);
  if (!did || !rkey) return null;

  const [activityRes, orgRes, fundingConfigRes] = await Promise.all([
    graphqlClient.request<ActivityResponse>(activityDocument, {
      uri: buildActivityUri(did, rkey),
    }),
    graphqlClient.request<OrgResponse>(orgDocument, { did }),
    graphqlClient.request<FundingConfigResponse>(fundingConfigDocument, {
      uri: buildFundingConfigUri(did, rkey),
    }),
  ]);

  const activity = activityRes.orgHypercertsClaimActivityByUri ?? null;
  if (!activity) return null;

  const org = pluckConnectionNodes(orgRes.appGainforestOrganizationInfo)[0] ?? null;
  const rawFc = fundingConfigRes.appGainforestFundingConfigByUri;

  return {
    id: params.id,
    rkey: activity.rkey,
    organizationDid: activity.did,
    title: activity.title,
    organizationName: org?.displayName ?? "",
    fundingConfig: rawFc
      ? {
          receivingWallet: rawFc.receivingWallet?.uri ? { uri: rawFc.receivingWallet.uri } : null,
          status: rawFc.status ?? null,
        }
      : null,
  };
}

export const defaultOptions = {
  staleTime: 60 * 1_000,
  retry: false,
} satisfies QueryModule<Params, CartBumicertItem | null>["defaultOptions"];

export function enabled(params: Params): boolean {
  return !!params.id;
}
