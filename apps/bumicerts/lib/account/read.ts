import "server-only";

import { countries } from "@/lib/countries";
import {
  fetchActorOrganizationNodeByDid,
  fetchActorProfileNodeByDid,
  fetchCertifiedLocationNodeByAtUri,
} from "@/graphql/indexer/queries/account";
import { $parse as parseActorOrganizationRecord } from "@gainforest/generated/app/certified/actor/organization.defs";
import { $parse as parseActorProfileRecord } from "@gainforest/generated/app/certified/actor/profile.defs";
import { $parse as parseCertifiedLocationRecord } from "@gainforest/generated/app/certified/location.defs";
import type {
  AccountLocationRef,
  AuthenticatedAccountState,
  CountryCode,
  CountryDefinition,
  ResolvedAccountCountry,
} from "./types";
import {
  AccountIndexerReadError,
  AccountRecordValidationError,
} from "./errors";
import {
  normalizeOrganizationLongDescriptionForRecord,
  normalizeProfileAvatarForRecord,
  normalizeProfileBannerForRecord,
} from "./indexer-normalization";
import {
  normalizeActorOrganizationRecordCandidate,
  normalizeActorProfileRecordCandidate,
} from "./record-normalization";

type CountryEntry = [CountryCode, CountryDefinition];

const countryEntries = Object.entries(countries) as CountryEntry[];

export async function readActorProfileRecordByDid(did: string) {
  let node;

  try {
    node = await fetchActorProfileNodeByDid(did);
  } catch (cause) {
    throw new AccountIndexerReadError({
      operation: "AccountActorProfile",
      message: "Indexer request failed for AccountActorProfile",
      cause,
    });
  }

  if (!node?.createdAt) {
    return null;
  }

  try {
    const avatar = await normalizeProfileAvatarForRecord(node.avatar, did);
    const banner = await normalizeProfileBannerForRecord(node.banner, did);

    return parseActorProfileRecord(
      normalizeActorProfileRecordCandidate({
        displayName: node.displayName ?? undefined,
        description: node.description ?? undefined,
        pronouns: node.pronouns ?? undefined,
        website: node.website ?? undefined,
        avatar: avatar ?? undefined,
        banner: banner ?? undefined,
        createdAt: node.createdAt,
      }),
    );
  } catch (cause) {
    throw new AccountRecordValidationError({
      did,
      collection: "app.certified.actor.profile",
      rkey: "self",
      cause,
    });
  }
}

export async function readActorOrganizationRecordByDid(did: string) {
  let node;

  try {
    node = await fetchActorOrganizationNodeByDid(did);
  } catch (cause) {
    throw new AccountIndexerReadError({
      operation: "AccountActorOrganization",
      message: "Indexer request failed for AccountActorOrganization",
      cause,
    });
  }

  if (!node?.createdAt) {
    return null;
  }

  try {
    return parseActorOrganizationRecord(
      normalizeActorOrganizationRecordCandidate({
        organizationType: node.organizationType ?? undefined,
        urls: node.urls ?? undefined,
        location:
          node.location?.uri && node.location?.cid
            ? {
                uri: node.location.uri,
                cid: node.location.cid,
              }
            : undefined,
        foundedDate: node.foundedDate ?? undefined,
        longDescription:
          normalizeOrganizationLongDescriptionForRecord(
            node.longDescription,
          ) ?? undefined,
        visibility: node.visibility ?? undefined,
        createdAt: node.createdAt,
      }),
    );
  } catch (cause) {
    throw new AccountRecordValidationError({
      did,
      collection: "app.certified.actor.organization",
      rkey: "self",
      cause,
    });
  }
}

export async function readCertifiedLocationRecordByAtUri(atUri: string) {
  let node;

  try {
    node = await fetchCertifiedLocationNodeByAtUri(atUri);
  } catch (cause) {
    throw new AccountIndexerReadError({
      operation: "CertifiedLocationByUri",
      message: "Indexer request failed for CertifiedLocationByUri",
      cause,
    });
  }

  if (!node?.createdAt || !node.lpVersion || !node.srs || !node.locationType) {
    return null;
  }

  try {
    return parseCertifiedLocationRecord({
      $type: "app.certified.location",
      lpVersion: node.lpVersion,
      srs: node.srs,
      locationType: node.locationType,
      location: node.location,
      name: node.name ?? undefined,
      description: node.description ?? undefined,
      createdAt: node.createdAt,
    });
  } catch (cause) {
    throw new AccountRecordValidationError({
      did: atUri.split("/")[2] ?? "",
      collection: "app.certified.location",
      rkey: atUri.split("/")[4] ?? "self",
      cause,
    });
  }
}

export function findCountryByLocationRef(
  location: AccountLocationRef,
): { code: CountryCode; definition: CountryDefinition } | null {
  for (const [code, definition] of countryEntries) {
    if (definition.uri === location.uri) {
      return { code, definition };
    }

    if (definition.cid === location.cid) {
      return { code, definition };
    }
  }

  return null;
}

export async function resolveCountryFromLocationRef(
  location: AccountLocationRef,
): Promise<ResolvedAccountCountry | null> {
  const matchedCountry = findCountryByLocationRef(location);
  if (!matchedCountry) {
    return null;
  }

  const locationRecord = await readCertifiedLocationRecordByAtUri(
    matchedCountry.definition.uri,
  );
  if (!locationRecord) {
    throw new AccountIndexerReadError({
      operation: "CertifiedLocationByUri",
      message:
        `Curated country mapping for ${matchedCountry.code} points to a missing certified location record`,
    });
  }

  return {
    code: matchedCountry.code,
    location,
    record: locationRecord,
  };
}

export async function readAccountStateByDid(
  did: string,
): Promise<AuthenticatedAccountState> {
  const profile = await readActorProfileRecordByDid(did);

  if (!profile) {
    return {
      kind: "unknown",
      did,
      profile: null,
      organization: null,
    };
  }

  const organization = await readActorOrganizationRecordByDid(did);

  if (!organization) {
    return {
      kind: "user",
      did,
      profile,
      organization: null,
    };
  }

  return {
    kind: "organization",
    did,
    profile,
    organization,
  };
}
