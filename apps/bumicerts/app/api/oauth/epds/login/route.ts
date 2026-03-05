/**
 * ePDS OAuth Login endpoint.
 *
 * Initiates the email-based OAuth flow via the ePDS server.
 * Accepts an optional `?email=` query parameter as a login hint.
 *
 * Uses the auth package's ePDS login handler which:
 * 1. Generates PKCE code verifier and challenge
 * 2. Generates DPoP key pair
 * 3. Sends Pushed Authorization Request (PAR) to ePDS
 * 4. Stores ephemeral state (code verifier + DPoP private key)
 * 5. Redirects user to ePDS authorization page
 */

import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export function GET(req: NextRequest) { return auth.handlers.epds.login.GET(req); }
