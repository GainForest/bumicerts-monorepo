/**
 * POST /api/atproto/onboarding/send-invite-email
 *
 * Sends an ATProto PDS invite code to a user's email address.
 *
 * Usage:
 *   POST /api/atproto/onboarding/send-invite-email
 *   Body: { email: "user@example.com", pdsDomain: "climateai.org" | "gainforest.id" }
 *
 * How it works:
 *   1. Rate limiting: Max 1 email per address per 5 minutes
 *   2. Invite code: Checks DB for existing code matching email+pdsDomain, reuses if found, otherwise mints new one via PDS admin API
 *   3. Email: Sends invite code via Resend
 *   4. Tracking: Records rate limit attempts immediately after checks pass (before email send) to prevent TOCTOU races
 *
 * Responses:
 *   200: { success: true }
 *   429: { error: "RateLimitExceeded", message: "...", retryAfter: "ISO timestamp" }
 *   400: Invalid request body
 *   500/502: Server or email service error
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { allowedPDSDomains, defaultPdsDomain, type AllowedPDSDomain } from "@/lib/config/pds";
import { InviteCodeEmail } from "@/email-templates/InviteCodeEmail";
import {
  getOrCreateInviteCode,
  isInviteCodeError,
} from "@/lib/atproto/invites";
import { getInviteEmailConfig, resend } from "@/lib/email/resend";
import { checkRateLimit, recordRateLimitAttempt, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const requestSchema = z.object({
  email: z.string().email().toLowerCase(),
  pdsDomain: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .default(defaultPdsDomain)
    .refine(
      (value) => ([...allowedPDSDomains] as string[]).includes(value),
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
    const pdsDomain = parsed.data.pdsDomain as AllowedPDSDomain;

    const clientIp = getClientIp(req.headers);

    // Check IP and email rate limits in parallel (independent DB queries)
    const [ipLimit, emailLimit] = await Promise.all([
      checkRateLimit(`ip:${clientIp}`, 'send-invite-email', RATE_LIMITS.sendInviteEmail.byIp),
      checkRateLimit(`email:${email}`, 'send-invite-email', RATE_LIMITS.sendInviteEmail.byEmail),
    ]);
    if (!ipLimit.allowed) {
      return Response.json(
        { error: 'RateLimitExceeded', message: 'Too many requests', retryAfter: ipLimit.resetAt.toISOString() },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((ipLimit.resetAt.getTime() - Date.now()) / 1000)) } }
      );
    }
    if (!emailLimit.allowed) {
      return Response.json(
        { error: 'RateLimitExceeded', message: 'Please wait before requesting another invite code', retryAfter: emailLimit.resetAt.toISOString() },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((emailLimit.resetAt.getTime() - Date.now()) / 1000)) } }
      );
    }

    // Record rate limit attempts immediately after checks pass, before any email
    // sending or invite code logic, to prevent TOCTOU race conditions where two
    // concurrent requests both pass the check before either records an attempt.
    await Promise.all([
      recordRateLimitAttempt(`ip:${clientIp}`, 'send-invite-email'),
      recordRateLimitAttempt(`email:${email}`, 'send-invite-email'),
    ]);

    const inviteCode = await getOrCreateInviteCode(
      supabase,
      email,
      pdsDomain
    );

    const { from, subject } = getInviteEmailConfig();
    const { error } = await resend.emails.send({
      from,
      to: [email],
      subject,
      react: InviteCodeEmail({ inviteCode, pdsDomain }),
    });

    if (error) {
      console.error("Failed to send invite email:", error);
      return Response.json(
        { error: "EmailError", message: "Failed to send invite email" },
        { status: 502 }
      );
    }

    return Response.json({ success: true });
  } catch (err: unknown) {
    if (isInviteCodeError(err)) {
      return Response.json(err.payload, { status: err.status });
    }

    console.error("Unexpected error in send-invite-email:", err);
    return Response.json(
      {
        error: "InternalServerError",
        message: "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}
