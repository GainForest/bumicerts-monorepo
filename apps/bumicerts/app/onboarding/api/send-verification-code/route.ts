/**
 * POST /onboarding/api/send-verification-code
 *
 * Sends a 6-digit OTP verification code to a user's email address.
 *
 * Usage:
 *   POST /onboarding/api/send-verification-code
 *   Body: { email: "user@example.com", pdsDomain: "climateai.org" | "gainforest.id" }
 *
 * How it works:
 *   1. Rate limiting: Max 1 email per address per 5 minutes, 10 per IP per hour
 *   2. OTP generation: Creates a 6-digit numeric code, hashes it with SHA-256
 *   3. Database upsert: Stores hash with 10-minute expiry (replaces any existing code for email+pdsDomain)
 *   4. Email: Sends OTP via Resend
 *   5. Tracking: Records rate limit attempts immediately after checks pass
 *
 * Responses:
 *   200: { success: true }
 *   429: { error: "RateLimitExceeded", message: "...", retryAfter: "ISO timestamp" }
 *   400: Invalid request body
 *   500/502: Server or email service error
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { signupPDSDomains, defaultSignupPdsDomain, type SignupPDSDomain } from "@/lib/config/pds";
import { VerificationCodeEmail } from "@/email-templates/VerificationCodeEmail";
import { generateOTP, hashOTP, getOTPExpiry } from "@/lib/otp";
import { getVerificationEmailConfig, resend } from "@/lib/email/resend";
import { checkRateLimit, recordRateLimitAttempt, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const requestSchema = z.object({
  email: z.string().email().toLowerCase(),
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

    const email = parsed.data.email;
    const pdsDomain = parsed.data.pdsDomain as SignupPDSDomain;

    const clientIp = getClientIp(req.headers);

    // Check IP and email rate limits in parallel (independent DB queries)
    const [ipLimit, emailLimit] = await Promise.all([
      checkRateLimit(`ip:${clientIp}`, 'send-verification-code', RATE_LIMITS.sendVerificationCode.byIp),
      checkRateLimit(`email:${email}`, 'send-verification-code', RATE_LIMITS.sendVerificationCode.byEmail),
    ]);

    if (process.env.NODE_ENV !== 'development') {
      if (!ipLimit.allowed) {
        return Response.json(
          { error: 'RateLimitExceeded', message: 'Too many requests', retryAfter: ipLimit.resetAt.toISOString() },
          { status: 429, headers: { 'Retry-After': String(Math.ceil((ipLimit.resetAt.getTime() - Date.now()) / 1000)) } }
        );
      }
      if (!emailLimit.allowed) {
        return Response.json(
          { error: 'RateLimitExceeded', message: 'Please wait before requesting another verification code', retryAfter: emailLimit.resetAt.toISOString() },
          { status: 429, headers: { 'Retry-After': String(Math.ceil((emailLimit.resetAt.getTime() - Date.now()) / 1000)) } }
        );
      }
    }

    // Record rate limit attempts immediately after checks pass, before any email
    // sending or OTP logic, to prevent TOCTOU race conditions where two
    // concurrent requests both pass the check before either records an attempt.
    await Promise.all([
      recordRateLimitAttempt(`ip:${clientIp}`, 'send-verification-code'),
      recordRateLimitAttempt(`email:${email}`, 'send-verification-code'),
    ]);

    // Generate OTP and hash it
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = getOTPExpiry();

    // Upsert verification code (replaces any existing code for this email+pdsDomain)
    const { error: upsertError } = await supabase
      .from("email_verification_codes")
      .upsert(
        {
          email,
          otp_hash: otpHash,
          pds_domain: pdsDomain,
          expires_at: expiresAt,
          verified_at: null,
        },
        { onConflict: "email,pds_domain" }
      );

    if (upsertError) {
      console.error("Failed to store verification code:", upsertError);
      return Response.json(
        { error: "DatabaseError", message: "Failed to generate verification code" },
        { status: 500 }
      );
    }

    // Send email with OTP
    const { from, subject } = getVerificationEmailConfig();
    const { error: emailError } = await resend.emails.send({
      from,
      to: [email],
      subject,
      react: VerificationCodeEmail({ otp, pdsDomain }),
    });

    if (emailError) {
      console.error("Failed to send verification email:", emailError);
      return Response.json(
        { error: "EmailError", message: "Failed to send verification email" },
        { status: 502 }
      );
    }

    return Response.json({ success: true });
  } catch (err: unknown) {
    console.error("Unexpected error in send-verification-code:", err);
    return Response.json(
      {
        error: "InternalServerError",
        message: "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}
