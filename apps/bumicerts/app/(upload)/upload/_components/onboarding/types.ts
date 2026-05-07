import type { LeafletLinearDocument } from "@gainforest/leaflet-react";

export type OnboardingKind = "user" | "organization";

export type BrandInfo = {
  found: boolean;
  name?: string;
  description?: string;
  logoUrl?: string;
  domain?: string;
  countryCode?: string;
  foundedYear?: number;
};

export type AccountSetupFormState = {
  displayName: string;
  shortDescription: string;
  website: string;
  country: string;
  startDate: string | null;
  longDescription: LeafletLinearDocument;
  primaryImage: File | undefined;
  bannerImage: File | undefined;
};

export type AccountSetupFieldName =
  | "displayName"
  | "shortDescription"
  | "website";

export type AccountSetupFieldErrors = Partial<
  Record<AccountSetupFieldName, string>
>;

export const EMPTY_ACCOUNT_SETUP_FORM: AccountSetupFormState = {
  displayName: "",
  shortDescription: "",
  website: "",
  country: "",
  startDate: null,
  longDescription: {
    $type: "pub.leaflet.pages.linearDocument",
    blocks: [],
  },
  primaryImage: undefined,
  bannerImage: undefined,
};
