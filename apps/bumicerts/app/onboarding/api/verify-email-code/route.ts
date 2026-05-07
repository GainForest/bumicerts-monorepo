/**
 * POST /onboarding/api/verify-email-code
 *
 * Verifies a 6-digit OTP code against the stored hash for an email.
 *
 * Usage:
 *   POST /onboarding/api/verify-email-code
 *   Body: { email: "user@example.com", otp: "123456", pdsDomain: "climateai.org" | "gainforest.id" }
 *
 * Validation checks:
 *   1. Code exists in database for email+pdsDomain
 *   2. Code has not expired (expires_at > now)
 *   3. Code has not been verified already (verified_at is null)
 *   4. OTP matches the stored hash (constant-time comparison)
 *
 * On success:
 *   - Sets verified_at to current timestamp
 *   - Returns { valid: true }
 *
 * Responses:
 *   200: { valid: true, message: "Email verified successfully" }
 *   400: Invalid code, expired, already used, or email mismatch
 *   429: Rate limited
 *   500: Server error
 */
import {
  signupPDSDomains,
  defaultSignupPdsDomain,
} from "@/lib/config/pds";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  checkRateLimit,
  recordRateLimitAttempt,
  getClientIp,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { verifyOTP, isOTPExpired } from "@/lib/otp";

const requestSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  otp: z.string().trim().length(6, "OTP must be 6 digits"),
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
});

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);

    const ipLimit = await checkRateLimit(
      `ip:${clientIp}`,
      "verify-email-code",
      RATE_LIMITS.verifyEmailCode.byIp
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

    const { email, otp, pdsDomain } = parsed.data;

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

    // Fetch verification code from database
    const codeResult = await supabase
      .from("email_verification_codes")
      .select("*")
      .eq("email", email)
      .eq("pds_domain", pdsDomain)
      .maybeSingle();

    if (codeResult.error) {
      console.error("Database error checking verification code:", codeResult.error);
      await recordRateLimitAttempt(`ip:${clientIp}`, "verify-email-code");
      return Response.json(
        { error: "DatabaseError", message: "Failed to check verification code" },
        { status: 500 }
      );
    }

    if (!codeResult.data) {
      await recordRateLimitAttempt(`ip:${clientIp}`, "verify-email-code");
      return Response.json(
        { error: "InvalidCode", message: "No verification code found for this email" },
        { status: 400 }
      );
    }

    // Check if already verified
    if (codeResult.data.verified_at) {
      await recordRateLimitAttempt(`ip:${clientIp}`, "verify-email-code");
      return Response.json(
        { error: "AlreadyVerified", message: "This code has already been verified" },
        { status: 400 }
      );
    }

    // Check if expired
    if (isOTPExpired(codeResult.data.expires_at)) {
      await recordRateLimitAttempt(`ip:${clientIp}`, "verify-email-code");
      return Response.json(
        { error: "CodeExpired", message: "This verification code has expired" },
        { status: 400 }
      );
    }

    // Verify OTP matches hash
    if (!verifyOTP(otp, codeResult.data.otp_hash)) {
      await recordRateLimitAttempt(`ip:${clientIp}`, "verify-email-code");
      return Response.json(
        { error: "InvalidCode", message: "Verification code is incorrect" },
        { status: 400 }
      );
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from("email_verification_codes")
      .update({ verified_at: new Date().toISOString() })
      .eq("email", email)
      .eq("pds_domain", pdsDomain);

    if (updateError) {
      console.error("Failed to mark code as verified:", updateError);
      await recordRateLimitAttempt(`ip:${clientIp}`, "verify-email-code");
      return Response.json(
        { error: "DatabaseError", message: "Failed to verify code" },
        { status: 500 }
      );
    }

    await recordRateLimitAttempt(`ip:${clientIp}`, "verify-email-code");
    return Response.json(
      {
        valid: true,
        message: "Email verified successfully",
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
