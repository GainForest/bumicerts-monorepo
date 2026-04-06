/**
 * POST /onboarding/api/onboard
 *
 * Combined account creation and organization initialization endpoint.
 * This endpoint handles the entire onboarding process in a single server-side call
 * to ensure tokens are never sent to the client.
 *
 * Usage:
 *   POST /onboarding/api/onboard
 *   Body: FormData with:
 *     - email: string
 *     - password: string
 *     - handle: string (without domain suffix)
 *     - inviteCode: string
 *     - pdsDomain: string (optional)
 *     - displayName: string
 *     - shortDescription: string
 *     - longDescription: string
 *     - country: string (ISO code)
 *     - website: string (optional)
 *     - startDate: string (optional, ISO date)
 *     - logo: File (optional)
 *
 * Responses:
 *   200: { success: true, did: string, handle: string }
 *   400: Validation error
 *   500: Server error
 */
import { NextRequest, after } from "next/server";
import { z } from "zod";
import {
  signupPDSDomains,
  defaultSignupPdsDomain,
} from "@/lib/config/pds";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, recordRateLimitAttempt, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { organizationInfoSchema } from "./schema";
import { textToLinearDocument } from "@/lib/utils/linearDocument";
import { Effect } from "effect";
import {
  mutations,
  makeCredentialAgentLayer,
  toSerializableFile,
  type LinearDocument,
} from "@gainforest/atproto-mutations-next";

const VALID_OBJECTIVES = ["Conservation", "Research", "Education", "Community", "Other"] as const;
type Objective = (typeof VALID_OBJECTIVES)[number];

const requestSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  handle: z.string().min(3, "Handle must be at least 3 characters").max(30),
  inviteCode: z.string().min(1, "Invite code is required"),
  pdsDomain: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .default(defaultSignupPdsDomain)
    .refine(
      (value) => ([...signupPDSDomains] as string[]).includes(value),
      { message: "Unsupported pdsDomain" }
    ),
  displayName: z.string().min(1).max(100),
  shortDescription: z.string().min(1).max(500),
  longDescription: z.string().min(50).max(5000),
  country: z.string().length(2),
  website: z.string().optional(),
  startDate: z.string().optional(),
  objectives: z.array(z.enum(VALID_OBJECTIVES)).optional().default(["Other"]),
});

type AccountCreationResponse = {
  handle: string;
  did: string;
  accessJwt: string;
  refreshJwt: string;
};

/**
 * Convert a File to base64 data URL format for SDK upload
 */
async function fileToBase64(file: File): Promise<{ name: string; type: string; dataBase64: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return {
    name: file.name,
    type: file.type,
    dataBase64: base64,
  };
}



export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);

    const ipLimit = await checkRateLimit(
      `ip:${clientIp}`,
      'onboard',
      RATE_LIMITS.onboard.byIp
    );
    if (!ipLimit.allowed) {
      return Response.json(
        { error: 'RateLimitExceeded', message: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((ipLimit.resetAt.getTime() - Date.now()) / 1000)) } }
      );
    }

    // Record rate limit attempt immediately after check passes, before any validation or PDS calls.
    // This ensures failed requests (validation errors, PDS errors) still consume a rate limit slot,
    // preventing brute-force probing.
    await recordRateLimitAttempt(`ip:${clientIp}`, 'onboard');

    const formData = await req.formData();

    // Extract form fields
    const objectivesRaw = formData.get("objectives") as string;
    let objectives: Objective[] = ["Other"];
    if (objectivesRaw) {
      try {
        const parsed = JSON.parse(objectivesRaw);
        if (Array.isArray(parsed) && parsed.every(o => VALID_OBJECTIVES.includes(o))) {
          objectives = parsed as Objective[];
        }
      } catch {
        // Keep default
      }
    }

    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      handle: formData.get("handle") as string,
      inviteCode: formData.get("inviteCode") as string,
      pdsDomain: (formData.get("pdsDomain") as string) || defaultSignupPdsDomain,
      displayName: formData.get("displayName") as string,
      shortDescription: formData.get("shortDescription") as string,
      longDescription: formData.get("longDescription") as string,
      country: formData.get("country") as string,
      website: formData.get("website") as string,
      startDate: formData.get("startDate") as string,
      objectives,
    };

    const logoFile = formData.get("logo") as File | null;

    // Step 1: Validate ALL inputs FIRST (before account creation)
    const parsed = requestSchema.safeParse(rawData);

    if (!parsed.success) {
      return Response.json(
        {
          error: "ValidationError",
          message: `Error in ${parsed.error.issues[0].path.join(".")}: ${parsed.error.issues[0].message}`,
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    // Additional organization info validation
    const orgInfoParsed = organizationInfoSchema.safeParse({
      displayName: parsed.data.displayName,
      shortDescription: parsed.data.shortDescription,
      longDescription: parsed.data.longDescription,
      country: parsed.data.country,
      website: parsed.data.website,
      startDate: parsed.data.startDate,
    });

    if (!orgInfoParsed.success) {
      return Response.json(
        {
          error: "ValidationError",
          message: `Error in ${orgInfoParsed.error.issues[0].path.join(".")}: ${orgInfoParsed.error.issues[0].message}`,
          issues: orgInfoParsed.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      email,
      password,
      handle,
      inviteCode,
      pdsDomain,
    } = parsed.data;

    const orgInfo = orgInfoParsed.data;

    // Step 2: Verify invite code exists and matches email
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return Response.json(
        {
          error: "ServerMisconfigured",
          message: "Database not configured",
        },
        { status: 500 }
      );
    }

    const inviteResult = await supabase
      .from("invites")
      .select("*")
      .eq("invite_token", inviteCode)
      .eq("pds_domain", pdsDomain)
      .maybeSingle();

    if (inviteResult.error) {
      console.error("Database error checking invite:", inviteResult.error);
      return Response.json(
        { error: "DatabaseError", message: "Failed to verify invite code" },
        { status: 500 }
      );
    }

    if (!inviteResult.data) {
      return Response.json(
        { error: "InvalidInvite", message: "Invite code not found" },
        { status: 400 }
      );
    }

    if (inviteResult.data.email !== email) {
      return Response.json(
        { error: "InvalidInvite", message: "Invite code does not match email" },
        { status: 400 }
      );
    }

    // Idempotency check: if invite was already used, return the existing DID
    if (inviteResult.data.used_at && inviteResult.data.used_by_did) {
      return Response.json({
        success: true,
        did: inviteResult.data.used_by_did,
        handle: `${handle}.${pdsDomain}`,
        organizationInitialized: true, // assume it was initialized on first attempt
        alreadyCreated: true,
      });
    }

    // Step 3: Create account on PDS
    const fullHandle = `${handle}.${pdsDomain}`;
    const accountResponse = await fetch(
      `https://${pdsDomain}/xrpc/com.atproto.server.createAccount`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          handle: fullHandle,
          inviteCode,
        }),
      }
    );

    if (!accountResponse.ok) {
      const errorData = await accountResponse.json().catch(() => ({}));
      console.error("Account creation failed:", errorData);
      return Response.json(
        {
          error: "AccountCreationFailed",
          message: errorData.message || "Failed to create account",
        },
        { status: accountResponse.status }
      );
    }

    const accountData = (await accountResponse.json()) as AccountCreationResponse;
    const { did, accessJwt, refreshJwt } = accountData;

    // Mark invite code as consumed after response is sent (non-blocking bookkeeping)
    after(async () => {
      try {
        await supabase
          .from("invites")
          .update({ used_at: new Date().toISOString(), used_by_did: did })
          .eq("invite_token", inviteCode)
          .eq("pds_domain", pdsDomain);
      } catch (error) {
        console.warn("Failed to mark invite as consumed:", error);
      }
    });

    // Step 4: Prepare logo upload (needed for org initialization)
    let logoUpload: { name: string; type: string; dataBase64: string } | undefined;
    if (logoFile && logoFile.size > 0) {
      try {
        logoUpload = await fileToBase64(logoFile);
      } catch (error) {
        console.warn("Failed to process logo file, continuing without it:", error);
      }
    }

    // Step 5: Initialize organization using mutations package
    let organizationInitialized = false;
    try {
      // Create a credential-based agent layer for the new account.
      // makeCredentialAgentLayer prepends "https://" internally — pass the
      // bare domain only, NOT a full URL (would produce "https://https://...").
      const agentLayer = makeCredentialAgentLayer({
        service: pdsDomain,
        identifier: did,
        password: password, // Use the password directly for credential auth
      });

      // Prepare logo as SerializableFile if provided
      let logoInput: Awaited<ReturnType<typeof toSerializableFile>> | undefined;
      if (logoFile && logoFile.size > 0) {
        logoInput = await toSerializableFile(logoFile);
      }

      // Create organization info record using Effect-based API
      const program = mutations.organization.info.upsert({
        displayName: orgInfo.displayName,
        shortDescription: { text: orgInfo.shortDescription },
        longDescription: textToLinearDocument(orgInfo.longDescription) as unknown as LinearDocument,
        objectives: parsed.data.objectives,
        country: orgInfo.country,
        visibility: "Public",
        website: orgInfo.website as `${string}:${string}` | undefined,
        startDate: orgInfo.startDate ? `${orgInfo.startDate}T00:00:00.000Z` as `${string}-${string}-${string}T${string}:${string}:${string}Z` : undefined,
        logo: logoInput ? { image: logoInput } : undefined,
      });

      // Run the Effect with the credential layer
      await Effect.runPromise(
        program.pipe(Effect.provide(agentLayer))
      );

      organizationInitialized = true;
    } catch (error) {
      // If org creation fails, log it but don't fail the request
      // The account is created, user can edit profile later
      console.error(
        "Failed to initialize organization for DID:",
        did,
        "- user can complete profile later. Error:",
        error
      );
    }

    return Response.json({
      success: true,
      did,
      handle: fullHandle,
      organizationInitialized,
    });
  } catch (err: unknown) {
    console.error("Unexpected error in onboard:", err);
    return Response.json(
      {
        error: "InternalServerError",
        message: "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}
