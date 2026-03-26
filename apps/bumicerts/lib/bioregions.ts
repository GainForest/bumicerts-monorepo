/**
 * OneEarth Bioregions Framework (2023) — Biogeographic Realms
 *
 * Maps ISO 3166-1 alpha-2 country codes to their primary biogeographic realm
 * based on the OneEarth Bioregions 2023 classification.
 *
 * @see https://www.oneearth.org/bioregions-2023/
 *
 * The 8 biogeographic realms are the broadest geographic divisions of the
 * Earth's land surface based on evolutionary history and species distributions.
 * Countries that span multiple realms are assigned to their dominant realm.
 */

export type Realm = {
  /** Display name */
  name: string;
  /** Short identifier (kebab-case) */
  id: string;
  /** Representative emoji for the realm */
  emoji: string;
  /** Brief description of the geographic area */
  description: string;
};

export const realms: Record<string, Realm> = {
  nearctic: {
    id: "nearctic",
    name: "Nearctic",
    emoji: "\u{1F3D4}\uFE0F", // mountain
    description: "North America",
  },
  neotropical: {
    id: "neotropical",
    name: "Neotropical",
    emoji: "\u{1F33F}", // herb
    description: "Central & South America, Caribbean",
  },
  palearctic: {
    id: "palearctic",
    name: "Palearctic",
    emoji: "\u{1F332}", // evergreen tree
    description: "Europe, North Africa & Northern Asia",
  },
  afrotropic: {
    id: "afrotropic",
    name: "Afrotropic",
    emoji: "\u{1F305}", // sunrise
    description: "Sub-Saharan Africa & Madagascar",
  },
  indomalayan: {
    id: "indomalayan",
    name: "Indomalayan",
    emoji: "\u{1F334}", // palm tree
    description: "South & Southeast Asia",
  },
  australasian: {
    id: "australasian",
    name: "Australasian",
    emoji: "\u{1F998}", // kangaroo
    description: "Australia, New Guinea & New Zealand",
  },
  oceanian: {
    id: "oceanian",
    name: "Oceanian",
    emoji: "\u{1F30A}", // ocean wave
    description: "Pacific Islands",
  },
  antarctic: {
    id: "antarctic",
    name: "Antarctic",
    emoji: "\u{2744}\uFE0F", // snowflake
    description: "Antarctica & Sub-Antarctic Islands",
  },
};

/**
 * Maps ISO 3166-1 alpha-2 country codes to their primary biogeographic realm.
 *
 * Countries spanning multiple realms are assigned to the realm that contains
 * the majority of their land area or ecological significance.
 */
export const countryToRealm: Record<string, string> = {
  // ── Nearctic ──────────────────────────────────────────────────────────────
  US: "nearctic",
  CA: "nearctic",
  GL: "nearctic", // Greenland
  BM: "nearctic",
  PM: "nearctic", // Saint Pierre and Miquelon

  // ── Neotropical ───────────────────────────────────────────────────────────
  MX: "neotropical",
  GT: "neotropical",
  BZ: "neotropical",
  SV: "neotropical",
  HN: "neotropical",
  NI: "neotropical",
  CR: "neotropical",
  PA: "neotropical",
  CU: "neotropical",
  JM: "neotropical",
  HT: "neotropical",
  DO: "neotropical",
  PR: "neotropical",
  TT: "neotropical",
  BB: "neotropical",
  DM: "neotropical",
  GD: "neotropical",
  LC: "neotropical",
  VC: "neotropical",
  AG: "neotropical",
  KN: "neotropical",
  BS: "neotropical",
  TC: "neotropical",
  KY: "neotropical",
  VG: "neotropical",
  VI: "neotropical",
  AW: "neotropical",
  CW: "neotropical",
  SX: "neotropical",
  BQ: "neotropical",
  AI: "neotropical",
  MS: "neotropical",
  GP: "neotropical",
  MQ: "neotropical",
  BL: "neotropical",
  MF: "neotropical",
  CO: "neotropical",
  VE: "neotropical",
  GY: "neotropical",
  SR: "neotropical",
  GF: "neotropical",
  BR: "neotropical",
  EC: "neotropical",
  PE: "neotropical",
  BO: "neotropical",
  PY: "neotropical",
  UY: "neotropical",
  AR: "neotropical",
  CL: "neotropical",
  FK: "neotropical",

  // ── Palearctic ────────────────────────────────────────────────────────────
  // Europe
  IS: "palearctic",
  NO: "palearctic",
  SE: "palearctic",
  FI: "palearctic",
  DK: "palearctic",
  GB: "palearctic",
  IE: "palearctic",
  NL: "palearctic",
  BE: "palearctic",
  LU: "palearctic",
  FR: "palearctic",
  DE: "palearctic",
  AT: "palearctic",
  CH: "palearctic",
  LI: "palearctic",
  MC: "palearctic",
  AD: "palearctic",
  ES: "palearctic",
  PT: "palearctic",
  IT: "palearctic",
  SM: "palearctic",
  VA: "palearctic",
  MT: "palearctic",
  SI: "palearctic",
  HR: "palearctic",
  BA: "palearctic",
  RS: "palearctic",
  ME: "palearctic",
  MK: "palearctic",
  AL: "palearctic",
  GR: "palearctic",
  BG: "palearctic",
  RO: "palearctic",
  MD: "palearctic",
  UA: "palearctic",
  BY: "palearctic",
  PL: "palearctic",
  CZ: "palearctic",
  SK: "palearctic",
  HU: "palearctic",
  EE: "palearctic",
  LV: "palearctic",
  LT: "palearctic",
  CY: "palearctic",
  TR: "palearctic",
  GE: "palearctic",
  AM: "palearctic",
  AZ: "palearctic",
  FO: "palearctic",
  SJ: "palearctic",
  AX: "palearctic",
  GG: "palearctic",
  JE: "palearctic",
  IM: "palearctic",
  GI: "palearctic",
  XK: "palearctic", // Kosovo
  // Northern Asia
  RU: "palearctic",
  KZ: "palearctic",
  UZ: "palearctic",
  TM: "palearctic",
  KG: "palearctic",
  TJ: "palearctic",
  MN: "palearctic",
  // East Asia (Palearctic portion dominant)
  CN: "palearctic",
  JP: "palearctic",
  KR: "palearctic",
  KP: "palearctic",
  TW: "palearctic",
  // North Africa & Middle East
  MA: "palearctic",
  DZ: "palearctic",
  TN: "palearctic",
  LY: "palearctic",
  EG: "palearctic",
  EH: "palearctic",
  SA: "palearctic",
  YE: "palearctic",
  OM: "palearctic",
  AE: "palearctic",
  QA: "palearctic",
  BH: "palearctic",
  KW: "palearctic",
  IQ: "palearctic",
  IR: "palearctic",
  AF: "palearctic",
  SY: "palearctic",
  JO: "palearctic",
  IL: "palearctic",
  PS: "palearctic",
  LB: "palearctic",

  // ── Afrotropic ────────────────────────────────────────────────────────────
  MR: "afrotropic",
  SN: "afrotropic",
  GM: "afrotropic",
  GW: "afrotropic",
  GN: "afrotropic",
  SL: "afrotropic",
  LR: "afrotropic",
  CI: "afrotropic",
  ML: "afrotropic",
  BF: "afrotropic",
  GH: "afrotropic",
  TG: "afrotropic",
  BJ: "afrotropic",
  NE: "afrotropic",
  NG: "afrotropic",
  TD: "afrotropic",
  CM: "afrotropic",
  CF: "afrotropic",
  SS: "afrotropic",
  SD: "afrotropic",
  ER: "afrotropic",
  DJ: "afrotropic",
  ET: "afrotropic",
  SO: "afrotropic",
  KE: "afrotropic",
  UG: "afrotropic",
  RW: "afrotropic",
  BI: "afrotropic",
  TZ: "afrotropic",
  CD: "afrotropic",
  CG: "afrotropic",
  GA: "afrotropic",
  GQ: "afrotropic",
  ST: "afrotropic",
  AO: "afrotropic",
  ZM: "afrotropic",
  MW: "afrotropic",
  MZ: "afrotropic",
  ZW: "afrotropic",
  BW: "afrotropic",
  NA: "afrotropic",
  ZA: "afrotropic",
  SZ: "afrotropic",
  LS: "afrotropic",
  MG: "afrotropic",
  KM: "afrotropic",
  MU: "afrotropic",
  SC: "afrotropic",
  RE: "afrotropic",
  YT: "afrotropic",
  CV: "afrotropic",

  // ── Indomalayan ───────────────────────────────────────────────────────────
  IN: "indomalayan",
  PK: "indomalayan",
  NP: "indomalayan",
  BT: "indomalayan",
  BD: "indomalayan",
  LK: "indomalayan",
  MV: "indomalayan",
  MM: "indomalayan",
  TH: "indomalayan",
  LA: "indomalayan",
  VN: "indomalayan",
  KH: "indomalayan",
  MY: "indomalayan",
  SG: "indomalayan",
  ID: "indomalayan",
  PH: "indomalayan",
  BN: "indomalayan",
  TL: "indomalayan",

  // ── Australasian ──────────────────────────────────────────────────────────
  AU: "australasian",
  NZ: "australasian",
  PG: "australasian",
  NC: "australasian",
  NF: "australasian",
  CX: "australasian",
  CC: "australasian",

  // ── Oceanian ──────────────────────────────────────────────────────────────
  FJ: "oceanian",
  WS: "oceanian",
  TO: "oceanian",
  VU: "oceanian",
  SB: "oceanian",
  KI: "oceanian",
  MH: "oceanian",
  FM: "oceanian",
  PW: "oceanian",
  NR: "oceanian",
  TV: "oceanian",
  CK: "oceanian",
  NU: "oceanian",
  TK: "oceanian",
  AS: "oceanian",
  GU: "oceanian",
  MP: "oceanian",
  PF: "oceanian",
  WF: "oceanian",

  // ── Antarctic ─────────────────────────────────────────────────────────────
  AQ: "antarctic",
  GS: "antarctic",
  BV: "antarctic",
  HM: "antarctic",
  TF: "antarctic",
};

/**
 * Get the realm for a given ISO 3166-1 alpha-2 country code.
 * Returns undefined if the country is not mapped.
 */
export function getRealmForCountry(countryCode: string): Realm | undefined {
  const realmId = countryToRealm[countryCode];
  return realmId ? realms[realmId] : undefined;
}

/**
 * Get all unique realms present in a list of country codes.
 * Returns realm entries sorted alphabetically by name.
 */
export function getRealmsForCountries(countryCodes: string[]): Realm[] {
  const realmIds = new Set<string>();
  for (const code of countryCodes) {
    const id = countryToRealm[code];
    if (id) realmIds.add(id);
  }
  return Array.from(realmIds)
    .map((id) => realms[id])
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}
