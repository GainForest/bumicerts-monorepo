import type { OccurrenceInput } from "./types";

/**
 * Adapter: converts an OccurrenceInput (app-layer, lat/lon as number) into
 * the shape expected by the tRPC dwc.occurrence.create mutation
 * (CreateDwcOccurrenceInput, lat/lon as string for ATProto PDS storage).
 *
 * This is the single, explicit conversion point between the bumicerts upload
 * domain model and the mutations-core API. Any future caller that needs to
 * pass an OccurrenceInput to createDwcOccurrence should go through here.
 */
export function occurrenceInputToCreateInput(
  occurrence: OccurrenceInput
): {
  scientificName: string;
  eventDate: string;
  decimalLatitude: string;
  decimalLongitude: string;
  basisOfRecord?: string;
  vernacularName?: string;
  recordedBy?: string;
  locality?: string;
  country?: string;
  countryCode?: string;
  occurrenceRemarks?: string;
  habitat?: string;
  samplingProtocol?: string;
  kingdom?: string;
  establishmentMeans?: string;
  datasetRef?: string;
} {
  const input: ReturnType<typeof occurrenceInputToCreateInput> = {
    scientificName: occurrence.scientificName,
    eventDate: occurrence.eventDate,
    // Explicit conversion: OccurrenceInput stores lat/lon as number for
    // numeric validation; CreateDwcOccurrenceInput stores them as string
    // because ATProto lexicon defines them as string fields.
    decimalLatitude: String(occurrence.decimalLatitude),
    decimalLongitude: String(occurrence.decimalLongitude),
  };

  if (occurrence.basisOfRecord !== undefined) input.basisOfRecord = occurrence.basisOfRecord;
  if (occurrence.vernacularName !== undefined) input.vernacularName = occurrence.vernacularName;
  if (occurrence.recordedBy !== undefined) input.recordedBy = occurrence.recordedBy;
  if (occurrence.locality !== undefined) input.locality = occurrence.locality;
  if (occurrence.country !== undefined) input.country = occurrence.country;
  if (occurrence.countryCode !== undefined) input.countryCode = occurrence.countryCode;
  if (occurrence.occurrenceRemarks !== undefined) input.occurrenceRemarks = occurrence.occurrenceRemarks;
  if (occurrence.habitat !== undefined) input.habitat = occurrence.habitat;
  if (occurrence.samplingProtocol !== undefined) input.samplingProtocol = occurrence.samplingProtocol;
  if (occurrence.kingdom !== undefined) input.kingdom = occurrence.kingdom;
  if (occurrence.establishmentMeans !== undefined) input.establishmentMeans = occurrence.establishmentMeans;
  if (occurrence.datasetRef !== undefined) input.datasetRef = occurrence.datasetRef;

  return input;
}
