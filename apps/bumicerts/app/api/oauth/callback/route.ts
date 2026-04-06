/**
 * OAuth 2.0 Callback endpoint.
 *
 * Handles the OAuth callback from the ATProto authorization server.
 * Uses the auth package's callback handler which:
 * 1. Exchanges the authorization code for access tokens
 * 2. Stores the OAuth session in Supabase
 * 3. Resolves the user's handle from their DID
 * 4. Saves the app session to an encrypted cookie
 * 5. Redirects to the configured success URL
 */

import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export function GET(req: NextRequest) { return auth.handlers.callback.GET(req); }
