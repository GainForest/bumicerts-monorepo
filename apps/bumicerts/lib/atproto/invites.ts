/**
 * ATProto Invite Code Management
 * 
 * This module handles invite code generation and management for ATProto Personal Data Servers (PDS).
 * ATProto requires invite codes to create new accounts on PDS instances.
 * 
 * ## Why This Exists
 * - PDS instances (climateai.org, gainforest.id) use invite-only registration
 * - We need to programmatically mint invite codes using admin credentials
 * - Invite codes are stored in our database and tied to user emails
 * 
 * ## Error Handling
 * Functions throw structured errors with HTTP status codes and error types because:
 * - Consumed by API routes that need to return proper HTTP responses
 * - Different error types (BadRequest, DatabaseError, UpstreamError, ServerMisconfigured) require different status codes
 * - The `isInviteCodeError` type guard allows API routes to distinguish our errors from unexpected ones
 * 
 * ## Key Functions
 * - `mintInviteCodes`: Calls PDS admin API to generate new invite codes
 * - `getOrCreateInviteCode`: Gets existing code or mints a new one for an email
 * - `fetchExistingInvites`: Batch fetch existing invite codes for multiple emails
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AllowedPDSDomain } from "@/lib/config/gainforest-sdk";

interface InviteCodeError extends Error {
  status: number;
  payload: { error: string; message: string };
}

function throwInviteError(
  status: number,
  errorType: string,
  message: string
): never {
  const error = new Error(message) as InviteCodeError;
  error.status = status;
  error.payload = { error: errorType, message };
  throw error;
}

const resolvePdsServiceUrl = (pdsDomain: AllowedPDSDomain) =>`https://${pdsDomain}`;

const getAdminBasicAuth = () => {
  if (!process.env.PDS_ADMIN_IDENTIFIER || !process.env.PDS_ADMIN_PASSWORD) {
    throwInviteError(
      500,
      "ServerMisconfigured",
      "Missing PDS_ADMIN_IDENTIFIER / PDS_ADMIN_PASSWORD env vars"
    );
  }

  const adminUsername = process.env.PDS_ADMIN_IDENTIFIER;
  const adminPassword = process.env.PDS_ADMIN_PASSWORD;
  return Buffer.from(`${adminUsername}:${adminPassword}`).toString("base64");
};

type XrpcInviteResponse = {
  codes: Array<{ account: string; codes: string[] }>;
};

export const mintInviteCodes = async (
  pdsDomain: AllowedPDSDomain,
  codeCount: number
): Promise<string[]> => {
  if (!Number.isInteger(codeCount) || codeCount <= 0) {
    throwInviteError(400, "BadRequest", "`codeCount` must be a positive integer");
  }

  const adminBasic = getAdminBasicAuth();
  const response = await fetch(
    `${resolvePdsServiceUrl(pdsDomain)}/xrpc/com.atproto.server.createInviteCodes`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${adminBasic}`,
      },
      body: JSON.stringify({ codeCount, useCount: 1 }),
    }
  );

  if (!response.ok) {
    throwInviteError(
      response.status,
      "UpstreamError",
      "Failed to create invite codes"
    );
  }

  const data = (await response.json()) as XrpcInviteResponse;
  const minted = data?.codes?.[0]?.codes ?? [];

  if (!Array.isArray(minted) || minted.length < codeCount) {
    throwInviteError(
      502,
      "UpstreamError",
      `PDS returned ${minted.length || 0} code(s) for ${codeCount} request(s)`
    );
  }

  return minted;
};

export const getOrCreateInviteCode = async (
  supabase: SupabaseClient,
  email: string,
  pdsDomain: AllowedPDSDomain
): Promise<string> => {
  // NOTE: Requires UNIQUE constraint on invites(email, pds_domain) in the database.
  // Without it, concurrent requests can create duplicate invite rows.
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await supabase
    .from("invites")
    .select("invite_token")
    .eq("email", normalizedEmail)
    .eq("pds_domain", pdsDomain)
    .maybeSingle();

  if (existing.error) {
    throwInviteError(500, "DatabaseError", "Failed to check existing invites");
  }

  if (existing.data?.invite_token) {
    return existing.data.invite_token;
  }

  const [inviteCode] = await mintInviteCodes(pdsDomain, 1);

  // Use upsert to handle race condition: if a concurrent request inserted
  // between our check and now, ignoreDuplicates prevents failure.
  // Requires UNIQUE constraint on (email, pds_domain) in the database.
  const upsertResult = await supabase
    .from("invites")
    .upsert(
      { email: normalizedEmail, invite_token: inviteCode, pds_domain: pdsDomain },
      { onConflict: "email,pds_domain", ignoreDuplicates: true }
    );

  if (upsertResult.error) {
    throwInviteError(500, "DatabaseError", "Failed to persist invite");
  }

  // Re-read to get whichever code won the race
  const finalResult = await supabase
    .from("invites")
    .select("invite_token")
    .eq("email", normalizedEmail)
    .eq("pds_domain", pdsDomain)
    .single();

  if (finalResult.error || !finalResult.data?.invite_token) {
    throwInviteError(500, "DatabaseError", "Failed to read back invite");
  }

  return finalResult.data.invite_token;
};

export const fetchExistingInvites = async (
  supabase: SupabaseClient,
  emails: string[],
  pdsDomain: AllowedPDSDomain
): Promise<Array<{ email: string; inviteCode: string }>> => {
  if (emails.length === 0) {
    return [];
  }

  const normalizedEmails = emails.map(e => e.trim().toLowerCase());

  const existing = await supabase
    .from("invites")
    .select("email, invite_token")
    .in("email", normalizedEmails)
    .eq("pds_domain", pdsDomain);

  if (existing.error) {
    throwInviteError(500, "DatabaseError", "Failed to fetch existing invites");
  }

  return (existing.data ?? []).map((row) => ({
    email: row.email,
    inviteCode: row.invite_token,
  }));
};

export const isInviteCodeError = (error: unknown): error is InviteCodeError =>
  Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      "payload" in error
  );
