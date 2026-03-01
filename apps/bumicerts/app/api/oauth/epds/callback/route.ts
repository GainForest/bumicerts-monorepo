/**
 * ePDS OAuth Callback endpoint.
 *
 * Handles the OAuth callback from the ePDS authorization server.
 *
 * Uses the auth package's ePDS callback handler which:
 * 1. Retrieves ephemeral state (code verifier + DPoP private key)
 * 2. Exchanges authorization code for tokens via DPoP
 * 3. Stores the OAuth session in Supabase
 * 4. Resolves the user's handle from their DID
 * 5. Saves the app session to an encrypted cookie
 * 6. Redirects to the configured success URL
 */

import { auth } from "@/lib/auth";

export const { GET } = auth.handlers.epds.callback;
