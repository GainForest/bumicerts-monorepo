import type { Main as AcMultimediaRecord } from "@gainforest/generated/app/gainforest/ac/multimedia.defs";
import type { SerializableFile } from "../../../blob/types";
import type { RecordMutationResult } from "../../../utils/shared/types";

export type { AcMultimediaRecord };

/** Returned by create. */
export type AcMultimediaMutationResult = RecordMutationResult<AcMultimediaRecord>;

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export type CreateAcMultimediaInput = {
  /** The image file (base64-encoded via SerializableFile). Maximum 100 MB. */
  imageFile: SerializableFile;
  /** AT-URI to parent occurrence record. */
  occurrenceRef?: string;
  /** AT-URI to site record. */
  siteRef?: string;
  /**
   * The part of the organism depicted, using TDWG Audubon Core subjectPart
   * controlled values. Examples: entireOrganism, leaf, bark, flower, etc.
   */
  subjectPart: string;
  /** Full IRI of the subjectPart term from the TDWG controlled vocabulary. */
  subjectPartUri?: string;
  /** Viewing orientation relative to the subject (dorsal, ventral, lateral, etc.). */
  subjectOrientation?: string;
  /** Human-readable description of the media content. */
  caption?: string;
  /** Name of the person or agent who created the media resource. */
  creator?: string;
  /** ISO 8601 datetime when the media resource was originally created. */
  createDate?: string;
  /** MIME type override (defaults to imageFile.type). */
  format?: string;
  /** URI to the original full-resolution media resource. */
  accessUri?: string;
  /** AC variant describing the quality/size of this service access point. */
  variantLiteral?: string;
  /** Optional caller-supplied rkey. PDS assigns a TID if omitted. */
  rkey?: string;
};
