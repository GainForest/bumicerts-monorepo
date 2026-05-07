import { NextRequest } from "next/server";
import { addRepos } from "@/lib/graphql-dev/mutations/add-repos";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  recordRateLimitAttempt,
} from "@/lib/rate-limit";

type AddReposRequestBody = {
  dids?: unknown;
};

const MAX_DIDS = 50;
const MAX_DID_LENGTH = 256;
const DID_REGEX = /^did:[a-z0-9]+:[A-Za-z0-9._:%-]+(?:[:][A-Za-z0-9._:%-]+)*$/;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateDids(value: unknown): { dids: string[] } | { error: string } {
  if (!isStringArray(value) || value.length === 0) {
    return { error: "dids must be a non-empty string array" };
  }

  if (value.length > MAX_DIDS) {
    return { error: `dids must contain at most ${MAX_DIDS} entries` };
  }

  const normalizedDids = value.map((did) => did.trim());

  if (normalizedDids.some((did) => did.length === 0)) {
    return { error: "dids must not contain empty strings" };
  }

  const invalidDid = normalizedDids.find(
    (did) => did.length > MAX_DID_LENGTH || !DID_REGEX.test(did),
  );

  if (invalidDid) {
    return { error: `Invalid DID provided: ${invalidDid}` };
  }

  return { dids: Array.from(new Set(normalizedDids)) };
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request.headers);
  const ipIdentifier = `ip:${clientIp}`;

  const ipLimit = await checkRateLimit(
    ipIdentifier,
    "indexer-add-repos",
    RATE_LIMITS.indexerAddRepos.byIp,
  );

  if (!ipLimit.allowed) {
    console.warn("[indexer/add-repos] Rate limited request", {
      clientIp,
      resetAt: ipLimit.resetAt.toISOString(),
    });

    return Response.json(
      {
        error: "RateLimitExceeded",
        message: "Too many add-repos requests",
        retryAfter: ipLimit.resetAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((ipLimit.resetAt.getTime() - Date.now()) / 1000),
          ),
        },
      },
    );
  }

  await recordRateLimitAttempt(ipIdentifier, "indexer-add-repos");

  let body: AddReposRequestBody | null = null;

  try {
    const parsedBody = (await request.json()) as unknown;

    if (parsedBody && typeof parsedBody === "object") {
      body = parsedBody as AddReposRequestBody;
    }
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validation = validateDids(body?.dids);
  if ("error" in validation) {
    console.warn("[indexer/add-repos] Validation failed", {
      clientIp,
      dids: body?.dids,
      error: validation.error,
    });

    return Response.json({ error: validation.error }, { status: 400 });
  }

  try {
    const enqueued = await addRepos(validation.dids);

    return Response.json({ ok: enqueued }, { status: enqueued ? 200 : 502 });
  } catch (error) {
    console.error("[indexer/add-repos] Failed to enqueue repos:", {
      clientIp,
      dids: validation.dids,
      error,
    });
    return Response.json({ error: "Failed to enqueue repos" }, { status: 500 });
  }
}
