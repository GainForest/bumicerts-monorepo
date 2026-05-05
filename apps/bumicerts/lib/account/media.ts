export function resolveAccountMediaUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  if (
    "uri" in value &&
    typeof (value as Record<string, unknown>)["uri"] === "string"
  ) {
    return (value as Record<string, unknown>)["uri"] as string;
  }

  const nested =
    "image" in value
      ? (value as Record<string, unknown>)["image"]
      : "blob" in value
        ? (value as Record<string, unknown>)["blob"]
        : null;

  if (
    nested &&
    typeof nested === "object" &&
    "uri" in nested &&
    typeof (nested as Record<string, unknown>)["uri"] === "string"
  ) {
    return (nested as Record<string, unknown>)["uri"] as string;
  }

  return null;
}

export function normalizeProfileAvatarForRecord(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;

  if (
    record["__typename"] === "OrgHypercertsDefsUri" &&
    typeof record["uri"] === "string"
  ) {
    return {
      $type: "org.hypercerts.defs#uri",
      uri: record["uri"],
    };
  }

  if (record["__typename"] === "OrgHypercertsDefsSmallImage") {
    return undefined;
  }

  return value;
}

export function normalizeProfileBannerForRecord(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;

  if (
    record["__typename"] === "OrgHypercertsDefsUri" &&
    typeof record["uri"] === "string"
  ) {
    return {
      $type: "org.hypercerts.defs#uri",
      uri: record["uri"],
    };
  }

  if (record["__typename"] === "OrgHypercertsDefsLargeImage") {
    return undefined;
  }

  return value;
}
