/**
 * Geographic aggregation utilities.
 *
 * Derives country-level platform stats from the org-DID -> country-code map.
 * Counts ALL organizations registered on the platform, regardless of whether
 * they have received donations — matching ecocertain's "Geographic Reach"
 * which counted all projects with GeoJSON.
 */

import { countries } from "@/lib/countries";

// -- Types --------------------------------------------------------------------

export interface CountryRow {
  countryCode: string;
  name: string;
  emoji: string;
  orgCount: number;
}

export interface GeoStats {
  countriesRepresented: number;
  topCountries: CountryRow[];
}

// -- Aggregation --------------------------------------------------------------

/**
 * Computes geographic platform stats from the full org country map.
 *
 * Every organization with a known country is counted once, grouped by country
 * code, and ranked by organization count descending.
 *
 * @param orgCountryMap  Map of org DID -> ISO 3166-1 alpha-2 country code
 * @param limit          Maximum number of top countries to return (default 5)
 */
export function computeGeoStats(
  orgCountryMap: Map<string, string>,
  limit = 5,
): GeoStats {
  const countryOrgCounts = new Map<string, number>();

  for (const countryCode of orgCountryMap.values()) {
    countryOrgCounts.set(
      countryCode,
      (countryOrgCounts.get(countryCode) ?? 0) + 1,
    );
  }

  const topCountries: CountryRow[] = Array.from(countryOrgCounts.entries())
    .map(([code, orgCount]) => {
      const country = countries[code];
      return {
        countryCode: code,
        name: country?.name ?? code,
        emoji: country?.emoji ?? "",
        orgCount,
      };
    })
    .sort((a, b) => b.orgCount - a.orgCount)
    .slice(0, limit);

  return {
    countriesRepresented: countryOrgCounts.size,
    topCountries,
  };
}
