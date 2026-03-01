import { allowedPDSDomains } from "@/lib/config/pds";
import { getBlobUrl, type BlobInput } from "@/lib/atproto/blobs";

export const getShapefilePreviewUrl = (
  shapefile:
    | string
    | {
        blob: BlobInput;
        did: string;
      }
) => {
  const suffix = "https://gainforest.app/geo/view?source-value=";
  if (typeof shapefile === "string") {
    return `${suffix}${encodeURIComponent(shapefile)}`;
  }
  const blobUrl = getBlobUrl(shapefile.did, shapefile.blob, allowedPDSDomains[0]);
  if (!blobUrl) {
    return `${suffix}`;
  }
  return `${suffix}${encodeURIComponent(blobUrl)}`;
};
