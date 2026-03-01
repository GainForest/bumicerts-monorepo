import { getBlobUrl } from "gainforest-sdk/utilities/atproto";
import { allowedPDSDomains } from "@/lib/config/gainforest-sdk";
import { BlobRefGenerator, BlobRef } from "gainforest-sdk/zod";

export const getShapefilePreviewUrl = (
  shapefile:
    | string
    | {
        blob: BlobRef | BlobRefGenerator;
        did: string;
      }
) => {
  const suffix = "https://gainforest.app/geo/view?source-value=";
  if (typeof shapefile === "string") {
    return `${suffix}${encodeURIComponent(shapefile)}`;
  }
  return `${suffix}${encodeURIComponent(
    getBlobUrl(shapefile.did, shapefile.blob, allowedPDSDomains[0])
  )}`;
};
