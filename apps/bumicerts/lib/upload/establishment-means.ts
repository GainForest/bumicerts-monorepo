export type EstablishmentMeansCode =
  | "native"
  | "introduced"
  | "naturalised"
  | "invasive"
  | "managed"
  | "uncertain";

export type EstablishmentMeansOption = {
  value: EstablishmentMeansCode | (string & {});
  label: string;
  description: string;
  gbifCodeLabel: string;
  legacy?: boolean;
};

export const PARTNER_ESTABLISHMENT_MEANS_OPTIONS = [
  {
    value: "managed",
    label: "Your team planted them",
    description:
      "Trees were intentionally planted and are actively maintained by your community.",
    gbifCodeLabel: "managed",
  },
  {
    value: "native",
    label: "They grew here naturally",
    description:
      "Trees seeded and grew on their own. Species belongs in this region.",
    gbifCodeLabel: "native",
  },
  {
    value: "naturalised",
    label: "They regenerated naturally",
    description:
      "Trees arrived from elsewhere and now self-seed and sustain without human help.",
    gbifCodeLabel: "naturalised",
  },
  {
    value: "uncertain",
    label: "Not sure",
    description:
      "Trees were already here when you started recording. Better to be honest than guess.",
    gbifCodeLabel: "uncertain",
  },
] as const satisfies readonly EstablishmentMeansOption[];

const LEGACY_ESTABLISHMENT_MEANS_OPTIONS = [
  {
    value: "introduced",
    label: "Introduced",
    description:
      "Species was brought here by people, but this older record does not specify whether it became naturalised or invasive.",
    gbifCodeLabel: "introduced",
    legacy: true,
  },
  {
    value: "invasive",
    label: "Invasive",
    description:
      "Species spreads aggressively outside its native range and can threaten local ecosystems.",
    gbifCodeLabel: "invasive",
    legacy: true,
  },
] as const satisfies readonly EstablishmentMeansOption[];

function createUnknownLegacyOption(value: string): EstablishmentMeansOption {
  return {
    value,
    label: value,
    description: "Legacy GBIF code preserved from an existing record.",
    gbifCodeLabel: value,
    legacy: true,
  };
}

export function getEstablishmentMeansOption(
  value: string | null | undefined
): EstablishmentMeansOption | null {
  if (!value) {
    return null;
  }

  const option = [
    ...PARTNER_ESTABLISHMENT_MEANS_OPTIONS,
    ...LEGACY_ESTABLISHMENT_MEANS_OPTIONS,
  ].find((item) => item.value === value);

  return option ?? createUnknownLegacyOption(value);
}

export function getSelectableEstablishmentMeansOptions(
  currentValue: string | null | undefined
): EstablishmentMeansOption[] {
  const options: EstablishmentMeansOption[] = [...PARTNER_ESTABLISHMENT_MEANS_OPTIONS];
  const currentOption = getEstablishmentMeansOption(currentValue);

  if (currentOption?.legacy) {
    options.push(currentOption);
  }

  return options;
}
