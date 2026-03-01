import { NextResponse } from "next/server";
import { DEFAULT_OAUTH_SCOPE } from "../oauth-client";
import { isLoopback } from "../utils/url";

export type ClientMetadataOptions = {
  clientName: string;
  /** Extra redirect URIs to include (e.g. ePDS callback). */
  extraRedirectUris?: string[];
  scope?: string;
  /** Logo URI for OAuth consent screens. */
  logoUri?: string;
  /** Brand color (hex) for OAuth consent screens. */
  brandColor?: string;
  /** Background color (hex) for OAuth consent screens. */
  backgroundColor?: string;
  /** Email template URI for OTP emails (ePDS). */
  emailTemplateUri?: string;
  /** Email subject template for OTP emails (ePDS). */
  emailSubjectTemplate?: string;
  /** Terms of service URI. */
  tosUri?: string;
  /** Privacy policy URI. */
  policyUri?: string;
};

/**
 * Creates a GET handler that serves the OAuth client metadata JSON.
 *
 * The client_id for web clients points to this endpoint. It must be publicly
 * accessible (i.e. not behind auth).
 *
 * For loopback (127.0.0.1/localhost) clients, returns RFC 8252 compliant
 * native app metadata with embedded redirect URIs in the client_id.
 */
export function createClientMetadataHandler(
  publicUrl: string,
  options: ClientMetadataOptions
) {
  const url = publicUrl.replace(/\/$/, "");
  const loopback = isLoopback(publicUrl);
  const scope = options.scope ?? DEFAULT_OAUTH_SCOPE;

  const redirectUris = [
    `${url}/api/oauth/callback`,
    ...(options.extraRedirectUris ?? []),
  ];

  // Common fields for both loopback and web clients
  const commonFields: Record<string, unknown> = {
    client_name: options.clientName,
    client_uri: url,
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope,
    dpop_bound_access_tokens: true,
    jwks_uri: `${url}/.well-known/jwks.json`,
  };

  // Optional branding fields
  if (options.logoUri) commonFields.logo_uri = options.logoUri;
  if (options.brandColor) commonFields.brand_color = options.brandColor;
  if (options.backgroundColor) commonFields.background_color = options.backgroundColor;
  if (options.emailTemplateUri) commonFields.email_template_uri = options.emailTemplateUri;
  if (options.emailSubjectTemplate) commonFields.email_subject_template = options.emailSubjectTemplate;
  if (options.tosUri) commonFields.tos_uri = options.tosUri;
  if (options.policyUri) commonFields.policy_uri = options.policyUri;

  return function GET() {
    if (loopback) {
      // Loopback/native client (RFC 8252)
      // client_id embeds scope and redirect URIs
      const params = new URLSearchParams();
      params.set("scope", scope);
      for (const uri of redirectUris) {
        params.append("redirect_uri", uri);
      }

      return NextResponse.json(
        {
          client_id: `http://localhost?${params.toString()}`,
          ...commonFields,
          token_endpoint_auth_method: "none",
          application_type: "native",
        },
        { headers: { "Cache-Control": "public, max-age=60" } }
      );
    }

    // Web client
    return NextResponse.json(
      {
        client_id: `${url}/client-metadata.json`,
        ...commonFields,
        token_endpoint_auth_method: "private_key_jwt",
        token_endpoint_auth_signing_alg: "ES256",
        application_type: "web",
      },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  };
}

/**
 * Creates a GET handler that serves the public JWKS (JSON Web Key Set).
 *
 * Derives the public key from the private JWK (strips the `d` parameter).
 * Must be publicly accessible.
 */
export function createJwksHandler(privateKeyJwk: string) {
  const { d: _d, ...publicKey } = JSON.parse(privateKeyJwk) as Record<
    string,
    unknown
  >;

  return function GET() {
    return NextResponse.json(
      { keys: [publicKey] },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  };
}
