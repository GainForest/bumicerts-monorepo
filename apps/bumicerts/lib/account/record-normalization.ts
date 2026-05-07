type StringLimits = {
  maxGraphemes?: number;
  maxLength?: number;
  trim?: boolean;
};

const graphemeSegmenter =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

const PROFILE_DISPLAY_NAME_LIMITS = { maxGraphemes: 64, maxLength: 640, trim: true };
const PROFILE_DESCRIPTION_LIMITS = { maxGraphemes: 256, maxLength: 2560 };
const PROFILE_PRONOUNS_LIMITS = { maxGraphemes: 20, maxLength: 200, trim: true };
const ORGANIZATION_TYPE_LIMITS = { maxGraphemes: 100, maxLength: 128, trim: true };
const ORGANIZATION_URL_LIMITS = { maxGraphemes: 2048, maxLength: 10000, trim: true };
const ORGANIZATION_URL_LABEL_LIMITS = {
  maxGraphemes: 64,
  maxLength: 640,
  trim: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getGraphemeSegments(value: string): string[] {
  if (!graphemeSegmenter) {
    return Array.from(value);
  }

  return Array.from(graphemeSegmenter.segment(value), (segment) => segment.segment);
}

function applyStringLimits(value: string, limits: StringLimits): string {
  if (limits.maxGraphemes === undefined && limits.maxLength === undefined) {
    return value;
  }

  let result = "";
  let graphemeCount = 0;

  for (const segment of getGraphemeSegments(value)) {
    if (
      limits.maxGraphemes !== undefined &&
      graphemeCount >= limits.maxGraphemes
    ) {
      break;
    }

    if (
      limits.maxLength !== undefined &&
      result.length + segment.length > limits.maxLength
    ) {
      break;
    }

    result += segment;
    graphemeCount += 1;
  }

  return result;
}

function normalizeOptionalString(
  value: unknown,
  limits: StringLimits = {},
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const prepared = limits.trim ? value.trim() : value;
  if (prepared.trim().length === 0) {
    return undefined;
  }

  const normalized = applyStringLimits(prepared, limits);
  return normalized.trim().length > 0 ? normalized : undefined;
}

function normalizeOrganizationType(
  value: unknown,
): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const organizationType = value
    .flatMap((entry) => {
      const normalized = normalizeOptionalString(entry, ORGANIZATION_TYPE_LIMITS);
      return normalized ? [normalized] : [];
    })
    .slice(0, 10);

  return organizationType.length > 0 ? organizationType : undefined;
}

function normalizeOrganizationUrls(
  value: unknown,
): ActorOrganizationUrlItemCandidate[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const urls: ActorOrganizationUrlItemCandidate[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }

    const url = normalizeOptionalString(entry.url, ORGANIZATION_URL_LIMITS);
    if (!url) {
      continue;
    }

    const label = normalizeOptionalString(
      entry.label,
      ORGANIZATION_URL_LABEL_LIMITS,
    );

    urls.push(label ? { url, label } : { url });
  }

  return urls.length > 0 ? urls : undefined;
}

function normalizeOrganizationLocation(
  value:
    | {
        uri?: unknown;
        cid?: unknown;
      }
    | null
    | undefined,
): { uri: string; cid: string } | undefined {
  if (!value) {
    return undefined;
  }

  const uri = normalizeOptionalString(value.uri, { trim: true });
  const cid = normalizeOptionalString(value.cid, { trim: true });

  if (!uri || !cid) {
    return undefined;
  }

  return { uri, cid };
}

function normalizeVisibility(
  value: unknown,
): "public" | "unlisted" | undefined {
  return value === "public" || value === "unlisted" ? value : undefined;
}

type ActorProfileRecordCandidate = {
  $type: "app.certified.actor.profile";
  displayName?: string;
  description?: string;
  pronouns?: string;
  website?: string;
  avatar?: unknown;
  banner?: unknown;
  createdAt: string;
};

type ActorOrganizationUrlItemCandidate = {
  url: string;
  label?: string;
};

export function normalizeActorProfileRecordCandidate(candidate: {
  displayName?: unknown;
  description?: unknown;
  pronouns?: unknown;
  website?: unknown;
  avatar?: unknown;
  banner?: unknown;
  createdAt: string;
}): ActorProfileRecordCandidate {
  return {
    $type: "app.certified.actor.profile",
    displayName: normalizeOptionalString(
      candidate.displayName,
      PROFILE_DISPLAY_NAME_LIMITS,
    ),
    description: normalizeOptionalString(
      candidate.description,
      PROFILE_DESCRIPTION_LIMITS,
    ),
    pronouns: normalizeOptionalString(
      candidate.pronouns,
      PROFILE_PRONOUNS_LIMITS,
    ),
    website: normalizeOptionalString(candidate.website, { trim: true }),
    avatar: candidate.avatar ?? undefined,
    banner: candidate.banner ?? undefined,
    createdAt: candidate.createdAt,
  };
}

type ActorOrganizationRecordCandidate = {
  $type: "app.certified.actor.organization";
  organizationType?: string[];
  urls?: ActorOrganizationUrlItemCandidate[];
  location?: { uri: string; cid: string };
  foundedDate?: string;
  longDescription?: unknown;
  visibility?: "public" | "unlisted";
  createdAt: string;
};

export function normalizeActorOrganizationRecordCandidate(candidate: {
  organizationType?: unknown;
  urls?: unknown;
  location?:
    | {
        uri?: unknown;
        cid?: unknown;
      }
    | null;
  foundedDate?: unknown;
  longDescription?: unknown;
  visibility?: unknown;
  createdAt: string;
}): ActorOrganizationRecordCandidate {
  return {
    $type: "app.certified.actor.organization",
    organizationType: normalizeOrganizationType(candidate.organizationType),
    urls: normalizeOrganizationUrls(candidate.urls),
    location: normalizeOrganizationLocation(candidate.location),
    foundedDate: normalizeOptionalString(candidate.foundedDate, { trim: true }),
    longDescription: candidate.longDescription ?? undefined,
    visibility: normalizeVisibility(candidate.visibility),
    createdAt: candidate.createdAt,
  };
}
