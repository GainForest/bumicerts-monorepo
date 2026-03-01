import {
  allowedPDSDomains,
  defaultPdsDomain,
  type AllowedPDSDomain,
} from "@/lib/config/gainforest-sdk";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  checkRateLimit,
  recordRateLimitAttempt,
  getClientIp,
  RATE_LIMITS,
} from "@/lib/rate-limit";

const requestSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  inviteCode: z.string().trim().min(1, "Invite code is required"),
  pdsDomain: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .default(defaultPdsDomain)
    .refine(
      (value) => (allowedPDSDomains as string[]).includes(value),
      { message: "Unsupported pdsDomain" }
    ),
});

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);

    const ipLimit = await checkRateLimit(
      `ip:${clientIp}`,
      "verify-invite-code",
      RATE_LIMITS.verifyInviteCode.byIp
    );
    if (!ipLimit.allowed) {
      return Response.json(
        { error: "RateLimitExceeded", message: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((ipLimit.resetAt.getTime() - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    const parsed = requestSchema.safeParse(await req.json());

    if (!parsed.success) {
      return Response.json(
        {
          error: "BadRequest",
          message: "Invalid request body",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { email, inviteCode, pdsDomain } = parsed.data;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return Response.json(
        {
          error: "ServerMisconfigured",
          message: "Supabase admin client not configured",
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
      await recordRateLimitAttempt(`ip:${clientIp}`, "verify-invite-code");
      return Response.json(
        { error: "DatabaseError", message: "Failed to check invite code" },
        { status: 500 }
      );
    }

    if (!inviteResult.data) {
      await recordRateLimitAttempt(`ip:${clientIp}`, "verify-invite-code");
      return Response.json(
        { error: "InvalidInvite", message: "Invite code not found" },
        { status: 400 }
      );
    }

    if (inviteResult.data.email !== email) {
      await recordRateLimitAttempt(`ip:${clientIp}`, "verify-invite-code");
      return Response.json(
        { error: "InvalidInvite", message: "Invite code does not match email" },
        { status: 400 }
      );
    }

    if (inviteResult.data.used_at) {
      await recordRateLimitAttempt(`ip:${clientIp}`, "verify-invite-code");
      return Response.json(
        { error: "InviteAlreadyUsed", message: "This invite code has already been used" },
        { status: 400 }
      );
    }

    await recordRateLimitAttempt(`ip:${clientIp}`, "verify-invite-code");
    return Response.json(
      {
        valid: true,
        message: "Invite code is valid for this email",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Unexpected error:", err);
    return Response.json(
      {
        error: "InternalServerError",
        message: "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}
