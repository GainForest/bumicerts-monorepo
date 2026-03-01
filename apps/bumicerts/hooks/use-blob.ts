import { AllowedPDSDomain } from "@/lib/config/pds";
import { useQuery } from "@tanstack/react-query";
import {
  getBlobUrl,
  type BlobRef,
  type BlobRefGenerator,
  type SmallImage,
  type LargeImage,
  type SmallBlob,
  type LargeBlob,
  type BlobInput,
} from "@/lib/atproto/blobs";
import { debug } from "@/lib/logger";

type BlobUrl =
  `https://${AllowedPDSDomain}/xrpc/com.atproto.sync.getBlob?did=${string}&cid=${string}`;

const useBlob = ({
  blob,
  did,
  pdsDomain,
}: {
  blob: BlobInput | BlobUrl | undefined;
  did: string | undefined;
  pdsDomain: AllowedPDSDomain;
}) => {
  const dataSource =
    typeof blob === "string"
      ? blob
      : did && blob
      ? getBlobUrl(did, blob as BlobInput, pdsDomain)
      : null;
  const { data, isPending, error, isPlaceholderData } = useQuery({
    queryKey: ["blob", blob],
    queryFn: async () => {
      if (!dataSource) throw new Error("blob and did are required.");
      const response = await fetch(dataSource);
      const file = await getFileFromResponse(response);
      debug.log(file);
      return file;
    },
    enabled: !!dataSource,
  });
  if (!dataSource) return null;
  if (isPlaceholderData)
    return {
      data: undefined,
      isPending: true,
      error: undefined,
    };
  return {
    data,
    isPending,
    error,
  };
};

const mimeToExt: Record<string, string> = {
  // JSON and GeoJSONs
  "application/geo+json": "geojson",
  "application/json": "json",
  "application/geojson": "geojson",

  // Images
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",

  // Plain text
  "text/plain": "txt",

  // Video
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogg",
  "video/quicktime": "mov",
  "video/mpeg": "mpeg",
  "video/mp3": "mp3",
  "video/wav": "wav",
  "video/aac": "aac",
  "video/m4a": "m4a",
  "video/m4v": "m4v",
  "video/m4b": "m4b",
  "video/m4p": "m4p",
};

function getExtensionFromHeaders(response: Response): string {
  // Try Content-Disposition first
  const disposition = response.headers.get("Content-Disposition");
  if (disposition) {
    const filenameMatch = disposition.match(
      /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
    );
    if (filenameMatch && filenameMatch[1]) {
      const filename = filenameMatch[1].replace(/['"]/g, "");
      const extMatch = filename.match(/\.([^.]+)$/);
      if (extMatch) return extMatch[1];
    }
  }

  // Fallback to Content-Type
  const contentType = response.headers.get("Content-Type") || "";
  const ext = Object.entries(mimeToExt).find(([mime]) =>
    contentType.includes(mime)
  )?.[1];

  return ext || "bin"; // Default for unknown
}

async function getFileFromResponse(response: Response): Promise<File> {
  const extension = getExtensionFromHeaders(response);
  const blob = await response.blob();
  return new File([blob], `file.${extension}`, {
    type: response.headers.get("Content-Type") || "",
  });
}

export default useBlob;
