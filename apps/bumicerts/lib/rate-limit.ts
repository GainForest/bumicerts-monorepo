import { createHmac } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const RATE_LIMIT_HMAC_KEY = process.env.RATE_LIMIT_HMAC_KEY ?? "";

if (!RATE_LIMIT_HMAC_KEY && process.env.NODE_ENV === "production") {
  console.warn(
    "[rate-limit] RATE_LIMIT_HMAC_KEY is not set — PII hashing is weakened. " +
    "Set this env var in production to protect email/IP privacy in the rate_limits table."
  );
}

/**
 * Hash an identifier (email/IP) with HMAC-SHA256 to avoid storing PII in the rate_limits table.
 * Lookups remain deterministic because the same key + identifier always produce the same hash.
 */
function hashIdentifier(identifier: string): string {
  return createHmac("sha256", RATE_LIMIT_HMAC_KEY)
    .update(identifier)
    .digest("hex");
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Max attempts allowed in window
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check if a request is within rate limits
 * Uses Supabase to track attempts in a sliding window
 *
 * In production, fails closed (blocks requests) when Supabase is unavailable.
 * In development or when RATE_LIMIT_FAIL_OPEN=true, fails open (allows requests).
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabase = getSupabaseAdmin();
  const failOpen =
    process.env.RATE_LIMIT_FAIL_OPEN === "true" ||
    process.env.NODE_ENV !== "production";

  if (!supabase) {
    if (!failOpen) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + config.windowMs),
      };
    }
    console.warn(
      "[RateLimit] Supabase not configured, skipping rate limit check"
    );
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: new Date(),
    };
  }

  const windowStart = new Date(Date.now() - config.windowMs);
  const hashedIdentifier = hashIdentifier(identifier);

  // Count attempts within the window
  const { count, error } = await supabase
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("identifier", hashedIdentifier)
    .eq("endpoint", endpoint)
    .gte("created_at", windowStart.toISOString());

  if (error) {
    console.error("[RateLimit] Error checking rate limit:", error);
    if (!failOpen) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + config.windowMs),
      };
    }
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: new Date(),
    };
  }

  const attempts = count ?? 0;
  const remaining = Math.max(0, config.maxAttempts - attempts);
  const resetAt = new Date(Date.now() + config.windowMs);

  return {
    allowed: attempts < config.maxAttempts,
    remaining,
    resetAt,
  };
}

/**
 * Record an attempt for rate limiting
 */
export async function recordRateLimitAttempt(
  identifier: string,
  endpoint: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (!supabase) return;

  const hashedIdentifier = hashIdentifier(identifier);
  const { error } = await supabase
    .from("rate_limits")
    .insert({ identifier: hashedIdentifier, endpoint });

  if (error) {
    console.error("[RateLimit] Error recording attempt:", error);
  }
}

/**
 * Extract client IP from Next.js request headers
 */
export function getClientIp(headers: Headers): string {
  // Prefer Vercel's trusted header (cannot be spoofed on Vercel)
  const vercelForwardedFor = headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(",")[0].trim();
  }

  // Fallback for non-Vercel deployments
  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp.trim();
  }

  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  return "unknown";
}

// Pre-configured rate limit settings
export const RATE_LIMITS = {
  passwordResetRequest: {
    byIp: { windowMs: 60 * 60 * 1000, maxAttempts: 10 }, // 10 per hour per IP
    byEmail: { windowMs: 15 * 60 * 1000, maxAttempts: 3 }, // 3 per 15 min per email
  },
  passwordReset: {
    byIp: { windowMs: 15 * 60 * 1000, maxAttempts: 10 }, // 10 per 15 min per IP
  },
  sendInviteEmail: {
    byIp: { windowMs: 60 * 60 * 1000, maxAttempts: 10 }, // 10 per hour per IP
    byEmail: { windowMs: 5 * 60 * 1000, maxAttempts: 1 }, // 1 per 5 min per email
  },
  verifyInviteCode: {
    byIp: { windowMs: 15 * 60 * 1000, maxAttempts: 20 }, // 20 per 15 min per IP
  },
  onboard: {
    byIp: { windowMs: 60 * 60 * 1000, maxAttempts: 5 }, // 5 per hour per IP
  },
  fetchBrandInfo: {
    byIp: { windowMs: 60 * 60 * 1000, maxAttempts: 20 },
  },
  generateShortDescription: {
    byIp: { windowMs: 60 * 60 * 1000, maxAttempts: 15 },
  },
} as const;
