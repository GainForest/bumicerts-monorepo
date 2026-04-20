import { auth } from "@/lib/auth";
import { serverEnv } from "@/lib/env/server";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  recordRateLimitAttempt,
} from "@/lib/rate-limit";
import {
  makeCredentialAgentLayer,
  mutations,
  SerializableFile,
} from "@gainforest/atproto-mutations-core";
import { NextRequest, NextResponse } from "next/server";
import { Effect } from "effect";

// Max file size (in MBs).
const MAX_FILE_SIZE = 4 * 1024 * 1024;

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const formatRemainingTimeDiff = (date: Date) => {
  const nowDate = new Date();
  const difference = Math.floor((date.getTime() - nowDate.getTime()) / 1000);

  if (difference <= 0) return null;

  const seconds = difference / 60;
  if (seconds < 60) {
    return seconds === 1 ? "in a few moments" : `in ${seconds} seconds`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? "in a minute" : `in ${minutes} minutes`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 60) {
    return hours === 1
      ? "after roughly an hour"
      : hours < 12
        ? `after roughly ${hours} hours`
        : "after a few hours";
  }
  return "later";
};

const signInAndUploadToPDS = async (file: File | Blob | SerializableFile) => {
  const service = serverEnv.UPLOADER_HANDLE.split(".").slice(1).join(".");
  const pdsHost = service.length > 0 ? service : "bsky.social";
  const agentLayer = makeCredentialAgentLayer({
    service: pdsHost,
    identifier: serverEnv.UPLOADER_DID,
    password: serverEnv.UPLOADER_PASSWORD,
  });
  const uploadResult = await Effect.runPromise(
    mutations.blob.upload({ file }).pipe(Effect.provide(agentLayer)),
  );
  const blob = uploadResult.blobRef as Record<string, unknown>;
  const ref = blob.ref;
  const cid =
    typeof ref === "string"
      ? ref
      : ref && typeof ref === "object" && "$link" in ref
        ? String((ref as Record<string, unknown>).$link ?? "")
        : ref && typeof (ref as { toString?: unknown }).toString === "function"
          ? String(ref)
          : "";
  if (!cid) {
    throw new Error("Upload successfull but cid not generated.");
  }
  const uri = `https://${pdsHost}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(serverEnv.UPLOADER_DID)}&cid=${encodeURIComponent(cid)}`;
  return {
    cid,
    uri,
  };
};

export const POST = async (request: NextRequest) => {
  const session = await auth.session.getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        {
          error: "No file provided. Please include a file in the 'file' field.",
        },
        { status: 400 },
      );
    }

    // Validate file is not empty
    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    // Validate MIME type
    if (
      !ALLOWED_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MIME_TYPES)[number],
      )
    ) {
      return NextResponse.json(
        {
          error: `${file.type} files are not supported. Only ${ALLOWED_MIME_TYPES.map((types) => types.split("/")[1]).join(", ")} are supported.`,
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "File too large",
          details: `Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB. Received: ${(
            file.size /
            1024 /
            1024
          ).toFixed(2)}MB`,
        },
        { status: 400 },
      );
    }

    // Check rate limit
    const clientIp = getClientIp(request.headers);
    const rateLimit = await checkRateLimit(
      `ip:${clientIp}`,
      "atproto-upload-image",
      RATE_LIMITS.uploadImage.byIp,
    );
    if (!rateLimit.allowed) {
      const resetDate = rateLimit.resetAt;
      const formattedTimeDiff = formatRemainingTimeDiff(resetDate);
      const message = formattedTimeDiff
        ? `You have exceeded the image upload limit. Please try again ${formattedTimeDiff}`
        : "You have exceed the image upload limit. Please try again.";
      return NextResponse.json(
        {
          error: message,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000),
            ),
          },
        },
      );
    }

    // Fire and forget rate limit attempt.
    recordRateLimitAttempt(`ip:${clientIp}`, "atproto-upload-image");

    // Upload on Gainforest's Upload PDS
    const uploadResponse = await signInAndUploadToPDS(file);
    return NextResponse.json(
      {
        cid: uploadResponse.cid,
        url: uploadResponse.uri,
        mimeType: file.type,
        size: file.size,
      },
      { status: 200 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error: `Something went wrong.`,
      },
      { status: 500 },
    );
  }
};
