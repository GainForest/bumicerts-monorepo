"use server";

import { allowedPDSDomains } from "@/lib/config/pds";
import { NextRequest } from "next/server";
import postgres from "postgres";

if (!process.env.POSTGRES_URL_NON_POOLING_ATPROTO_AUTH_MAPPING) {
  throw new Error("Missing POSTGRES_URL_NON_POOLING_ATPROTO_AUTH_MAPPING env var");
}
if (!process.env.INVITE_CODES_PASSWORD) {
  throw new Error("Missing INVITE_CODES_PASSWORD env var");
}
if (!process.env.PDS_ADMIN_IDENTIFIER || !process.env.PDS_ADMIN_PASSWORD) {
  throw new Error("Missing PDS_ADMIN_IDENTIFIER / PDS_ADMIN_PASSWORD env vars");
}

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING_ATPROTO_AUTH_MAPPING, { ssl: "require" });

type XrpcInviteResponse = {
  codes: Array<{ account: string; codes: string[] }>;
};

export async function POST(req: NextRequest) {
  try {
    // --- Parse & normalize body ---
    const body = (await req.json()) as {
      email?: string;
      emails?: string[];
      password?: string; 
    };

    const emailsInput =
      Array.isArray(body.emails) && body.emails.length > 0 ? body.emails
      : body.email ? [body.email]
      : [];

    const emails = emailsInput
      .map((e) => (e ?? "").trim().toLowerCase())
      .filter(Boolean);

      // hard code use count so that only one use per invite code
    const useCount = 1;

    if (emails.length === 0) {
      return new Response(JSON.stringify({ error: "BadRequest", message: "Missing required email(s)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!Number.isInteger(useCount) || useCount <= 0) {
      return new Response(JSON.stringify({ error: "BadRequest", message: "`useCount` must be a positive integer" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isAdmin = process.env.INVITE_CODES_PASSWORD === (body.password ?? "");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Invalid admin credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const service = process.env.NEXT_PUBLIC_ATPROTO_SERVICE_URL || `https://${allowedPDSDomains[0]}`;
    const adminUsername = process.env.PDS_ADMIN_IDENTIFIER!;
    const adminPassword = process.env.PDS_ADMIN_PASSWORD!;
    const adminBasic = Buffer.from(`${adminUsername}:${adminPassword}`).toString("base64");

    // so N codes for N emails  with use count being 1
    const codeCount = emails.length;

    const response = await fetch(`${service}/xrpc/com.atproto.server.createInviteCodes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${adminBasic}`,
      },
      body: JSON.stringify({ codeCount, useCount }),
      // If your PDS is strict about JSON ints, the cast above ensures numbers.
    });

    if (!response.ok) {
      const error = await response.json();
      return new Response(
        error,
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = (await response.json()) as XrpcInviteResponse;
    const minted = data?.codes?.[0]?.codes ?? [];

    if (!Array.isArray(minted) || minted.length < emails.length) {
      return new Response(
        JSON.stringify({
          error: "UpstreamError",
          message: `PDS returned ${minted.length || 0} code(s) for ${emails.length} email(s)`,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Pair first N codes to N emails; insert all mappings in parallel
    let results: { email: string; inviteCode: string }[];
    try {
      results = await Promise.all(
        emails.map(async (email, i) => {
          const inviteCode = minted[i];
          await sql`
            INSERT INTO invites (email, invite_token, pds_domain)
            VALUES (${email}, ${inviteCode}, ${allowedPDSDomains[0]})
          `;
          return { email, inviteCode };
        })
      );
    } catch (dbErr) {
      console.error("Failed to insert invite(s):", dbErr);
      return new Response(
        JSON.stringify({ error: "DatabaseError", message: "Failed to persist invite(s)" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ invites: results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        error: "InternalServerError",
        message: (err as Record<string, string>)?.message || "Unexpected error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
