import { countries } from "@/lib/countries";
import type { Main as ActorOrganizationRecord } from "@gainforest/generated/app/certified/actor/organization.defs";
import type { Main as ActorProfileRecord } from "@gainforest/generated/app/certified/actor/profile.defs";
import type { Main as CertifiedLocationRecord } from "@gainforest/generated/app/certified/location.defs";

/**
 * Phase 0 account-model contract for the Certified actor migration.
 *
 * These types intentionally do not encode any legacy
 * `app.gainforest.organization.info` knowledge. They describe the desired
 * future account model that the rest of the app will migrate toward.
 */

export type CountryCode = keyof typeof countries;

/**
 * Canonical country metadata and Certified-location mapping entry sourced from
 * `@/lib/countries`.
 */
export type CountryDefinition = (typeof countries)[CountryCode];

export type AccountKind =
  | "unauthenticated"
  | "unknown"
  | "user"
  | "organization";

export type AccountLocationRef = NonNullable<ActorOrganizationRecord["location"]>;

export type AccountUrls = NonNullable<ActorOrganizationRecord["urls"]>;

export interface ResolvedAccountCountry {
  code: CountryCode;
  location: AccountLocationRef;
  record: CertifiedLocationRecord;
}

export interface UnauthenticatedAccountState {
  kind: "unauthenticated";
  did: null;
  profile: null;
  organization: null;
}

export interface UnknownAccountState {
  kind: "unknown";
  did: string;
  profile: null;
  organization: null;
}

export interface UserAccountState {
  kind: "user";
  did: string;
  profile: ActorProfileRecord;
  organization: null;
}

export interface OrganizationAccountState {
  kind: "organization";
  did: string;
  profile: ActorProfileRecord;
  organization: ActorOrganizationRecord;
}

/**
 * Canonical UI-facing account state.
 *
 * Classification rules:
 * - no authenticated session => unauthenticated
 * - authenticated DID with no actor.profile => unknown
 * - actor.profile with no actor.organization => user
 * - actor.profile plus actor.organization => organization
 */
export type AccountState =
  | UnauthenticatedAccountState
  | UnknownAccountState
  | UserAccountState
  | OrganizationAccountState;

export type AuthenticatedAccountState = Exclude<
  AccountState,
  UnauthenticatedAccountState
>;

export type OnboardedAccountState = Extract<
  AccountState,
  UserAccountState | OrganizationAccountState
>;

/**
 * Shared account summary shape intended for React Query / API responses.
 *
 * It is deliberately identical to AccountState so that the API, cache, and UI
 * all share the same discriminated union.
 */
export type AccountSummary = AccountState;
