/**
 * JSON Web Key Set (JWKS) endpoint.
 *
 * Serves the public keys used for OAuth token endpoint authentication.
 * ATProto authorization servers fetch this to verify the signatures
 * on our client assertion JWTs.
 *
 * Only the public key components are exposed - the private key is
 * kept secret in the ATPROTO_JWK_PRIVATE environment variable.
 */

import { auth } from "@/lib/auth";

export const { GET } = auth.handlers.jwks;
