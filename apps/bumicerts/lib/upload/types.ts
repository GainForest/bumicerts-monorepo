export type ColumnMapping = {
  sourceColumn: string;
  targetField: string;
  transform?: (value: string) => string;
};

export type MappedRow = Record<string, string>;

export type OccurrenceInput = {
  scientificName: string;
  eventDate: string;
  decimalLatitude: number;
  decimalLongitude: number;
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
  dynamicProperties?: string;
};

export type FloraMeasurementBundle = {
  dbh?: string;
  totalHeight?: string;
  diameter?: string; // maps to basalDiameter in PDS
  canopyCoverPercent?: string;
};

export type PhotoEntry = {
  url: string;
  subjectPart: string;
};

export type ValidatedRow = {
  index: number;
  occurrence: OccurrenceInput;
  floraMeasurement: FloraMeasurementBundle | null;
  photos?: PhotoEntry[];
};

export type RowError = {
  index: number;
  issues: { path: string; message: string }[];
};

export type ValidationResult = {
  valid: ValidatedRow[];
  errors: RowError[];
};

export type TargetField = {
  field: string;
  label: string;
  required: boolean;
  category: "occurrence" | "measurement" | "media";
};

export const TARGET_FIELDS: TargetField[] = [
  // Required occurrence (4)
  { field: "scientificName", label: "Scientific Name", required: true, category: "occurrence" },
  { field: "eventDate", label: "Event Date", required: true, category: "occurrence" },
  { field: "decimalLatitude", label: "Decimal Latitude", required: true, category: "occurrence" },
  { field: "decimalLongitude", label: "Decimal Longitude", required: true, category: "occurrence" },
  // Optional occurrence (5)
  { field: "vernacularName", label: "Vernacular Name", required: false, category: "occurrence" },
  { field: "recordedBy", label: "Recorded By", required: false, category: "occurrence" },
  { field: "locality", label: "Locality", required: false, category: "occurrence" },
  { field: "country", label: "Country", required: false, category: "occurrence" },
  { field: "occurrenceRemarks", label: "Occurrence Remarks", required: false, category: "occurrence" },
  // Habitat (1)
  { field: "habitat", label: "Habitat", required: false, category: "occurrence" },
  // Measurement (4)
  { field: "totalHeight", label: "Height", required: false, category: "measurement" },
  { field: "dbh", label: "DBH", required: false, category: "measurement" },
  { field: "diameter", label: "Diameter", required: false, category: "measurement" },
  { field: "canopyCoverPercent", label: "Canopy Cover (%)", required: false, category: "measurement" },
  // Media (1) — multiple columns can map to photoUrl; subject part is auto-detected from column name
  { field: "photoUrl", label: "Photo URL", required: false, category: "media" },
];
