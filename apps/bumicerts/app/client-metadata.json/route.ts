/**
 * OAuth 2.0 Client Metadata endpoint.
 *
 * Serves the OAuth client metadata document required by ATProto authorization
 * servers. This describes the application's OAuth configuration including
 * redirect URIs, branding, and authentication methods.
 *
 * The handler automatically switches between loopback (development) and
 * web (production) client configurations based on the public URL.
 */

import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export function GET(req: NextRequest) { return auth.handlers.clientMetadata.GET(req); }
