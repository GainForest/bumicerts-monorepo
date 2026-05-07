/**
 * Human-readable field labels for validation error messages.
 * Used by formatMutationError() to map lexicon field paths to user-friendly names.
 *
 * When adding new lexicon fields, add their labels here to ensure
 * validation errors are user-friendly.
 *
 * @example
 * // Without label:
 * "displayName must be at least 8 characters"
 *
 * // With label from this registry:
 * "Display name must be at least 8 characters"
 */
export const FIELD_LABELS: Record<string, string> = {
  // Core fields
  name: "Name",
  displayName: "Display name",
  title: "Title",
  description: "Description",
  shortDescription: "Short description",
  longDescription: "Long description",
  caption: "Caption",
  text: "Text",
  content: "Content",
  blocks: "Content blocks",

  // Dates & timestamps
  createdAt: "Created date",
  updatedAt: "Updated date",
  date: "Date",
  startDate: "Start date",
  endDate: "End date",
  eventDate: "Event date",
  createDate: "Creation date",
  measurementDate: "Measurement date",
  recordedAt: "Recording date",
  timestamp: "Timestamp",
  workTimeframeStart: "Work start date",
  workTimeframeEnd: "Work end date",
  impactTimeframeStart: "Impact start date",
  impactTimeframeEnd: "Impact end date",

  // Files & blobs
  file: "File",
  blob: "File",
  audioFile: "Audio file",
  imageFile: "Image file",
  shapefile: "Shapefile",
  logo: "Logo",
  image: "Image",

  // Rich content
  facets: "Text formatting",

  // Identifiers
  rkey: "Record key",
  uri: "URI",
  cid: "Content ID",
  url: "URL",
  accessUri: "Access URL",
  occurrenceID: "Occurrence ID",
  datasetID: "Dataset ID",

  // Darwin Core taxonomy
  scientificName: "Scientific name",
  taxonRank: "Taxonomic rank",
  kingdom: "Kingdom",
  family: "Family",
  genus: "Genus",
  specificEpithet: "Specific epithet",
  establishmentMeans: "Establishment means",
  habitat: "Habitat",
  vernacularName: "Common name",

  // Darwin Core occurrence
  occurrenceRemarks: "Occurrence remarks",
  recordedBy: "Recorded by",
  identifiedBy: "Identified by",
  occurrenceRef: "Occurrence reference",
  basisOfRecord: "Basis of record",
  occurrenceStatus: "Occurrence status",
  geodeticDatum: "Geodetic datum",
  decimalLatitude: "Latitude",
  decimalLongitude: "Longitude",
  locality: "Locality",
  country: "Country",
  countryCode: "Country code",
  samplingProtocol: "Sampling protocol",
  license: "License",
  projectRef: "Project reference",
  datasetRef: "Dataset reference",

  // Darwin Core measurement
  measurementType: "Measurement type",
  measurementValue: "Measurement value",
  measurementUnit: "Measurement unit",
  measurementMethod: "Measurement method",
  measurementRemarks: "Measurement remarks",
  measuredBy: "Measured by",
  recordCount: "Record count",

  // Flora measurements
  dbh: "Diameter at breast height",
  totalHeight: "Total height",
  basalDiameter: "Basal diameter",
  canopyCoverPercent: "Canopy cover percentage",

  // Audubon Core
  creator: "Creator",
  format: "Format",
  variantLiteral: "Variant",
  subjectPart: "Subject part",
  subjectPartUri: "Subject part URI",
  subjectOrientation: "Subject orientation",
  siteRef: "Site reference",

  // Audio metadata
  codec: "Audio codec",
  channels: "Audio channels",
  duration: "Duration",
  sampleRate: "Sample rate",

  // Claim fields
  workScope: "Work scope",
  impactScope: "Impact scope",
  contributors: "Contributors",
  rights: "Rights",
  allowlistUri: "Allowlist URI",
  transferRestrictions: "Transfer restrictions",

  // Funding
  minAmount: "Minimum amount",
  maxAmount: "Maximum amount",
  targetAmount: "Target amount",
  amount: "Amount",
  fundingType: "Funding type",
  currency: "Currency",
  evmLink: "EVM link",
  transactionHash: "Transaction hash",
  blockNumber: "Block number",
  from: "From address",
  to: "To address",
  tokenSymbol: "Token symbol",

  // Location
  lpVersion: "Location protocol version",
  srs: "Spatial reference system",
  locationType: "Location type",
  location: "Location data",
  site: "Site",
  locationUri: "Location URI",

  // Organization
  objectives: "Objectives",
  headquarters: "Headquarters",
  foundedYear: "Year founded",
  website: "Website",
  email: "Email",
  phone: "Phone",
  socialLinks: "Social links",
  certifications: "Certifications",
  type: "Type",
  visibility: "Visibility",

  // Link (EVM)
  chainId: "Chain ID",
  contractAddress: "Contract address",
  tokenId: "Token ID",
  ownerAddress: "Owner address",
  userProof: "User proof",
  platformAttestation: "Platform attestation",

  // Context
  mimeType: "MIME type",
  size: "File size",
} as const;
