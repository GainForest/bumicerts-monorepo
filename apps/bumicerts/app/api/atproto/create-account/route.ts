import { NextRequest } from "next/server";
import { headers } from "next/headers";
import postgres from "postgres";
import { allowedPDSDomains } from "@/lib/config/pds";
import { env } from "process";
import { checkRateLimit, recordRateLimitAttempt } from "@/lib/rate-limit";

if (!env.POSTGRES_URL_NON_POOLING_ATPROTO_AUTH_MAPPING) {
  throw new Error(
    "Missing POSTGRES_URL_NON_POOLING_ATPROTO_AUTH_MAPPING env var"
  );
}
const sql = postgres(env.POSTGRES_URL_NON_POOLING_ATPROTO_AUTH_MAPPING, {
  ssl: "require",
});

export async function POST(req: NextRequest) {
  const clientIp =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const { allowed, resetAt } = await checkRateLimit(
    `ip:${clientIp}`,
    "create-account",
    { maxAttempts: 5, windowMs: 60 * 60 * 1000 }
  );
  if (!allowed) {
    const retryAfterSeconds = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
    return new Response(
      JSON.stringify({ error: "Too many requests" }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSeconds),
        },
      }
    );
  }
  await recordRateLimitAttempt(`ip:${clientIp}`, "create-account");

  try {
    const body = (await req.json()) as {
      email: string;
      password: string;
      handle: string;
      inviteCode: string;
    };
    let { email, password, handle, inviteCode } = body;
    email = (email ?? "").trim().toLowerCase();
    password = (password ?? "").trim();
    handle = (handle ?? "").trim();
    inviteCode = (inviteCode ?? "").trim();

    if (!email || !password || !handle || !inviteCode) {
      return new Response(
        JSON.stringify({
          error: "BadRequest",
          message: "Missing required fields",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const inviteCodeInfo =
      await sql`SELECT * FROM invites WHERE invite_token = ${inviteCode}`;
    if (inviteCodeInfo.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invite code not found in db" }),
        { status: 400 }
      );
    }
    if (inviteCodeInfo[0].email !== email) {
      return new Response(
        JSON.stringify({ error: "Invite code does not match email" }),
        { status: 400 }
      );
    }

    const service = allowedPDSDomains[0];

    const response = await fetch(
      `https://${service}/xrpc/com.atproto.server.createAccount`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, handle, inviteCode }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Account creation failed:", error);
      return new Response(JSON.stringify(error), { status: response.status });
    }

    const data = (await response.json()) as {
      handle: string;
      did: string;
      accessJwt: string;
      refreshJwt: string;
    };
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err: unknown) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message:
          (err as Record<string, string>).message ||
          "Unexpected error occurred",
      }),
      { status: 500 }
    );
  }
}
