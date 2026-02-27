import { NextResponse } from "next/server";

export type ClientMetadataOptions = {
  clientName: string;
  redirectPath?: string;
  scope?: string;
};

export function createClientMetadataHandler(
  publicUrl: string,
  options: ClientMetadataOptions
) {
  const url = publicUrl.replace(/\/$/, "");
  const redirectPath = options.redirectPath ?? "/api/oauth/callback";

  const metadata = {
    client_id: `${url}/client-metadata.json`,
    client_name: options.clientName,
    client_uri: url,
    redirect_uris: [`${url}${redirectPath}`],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: options.scope ?? "atproto",
    token_endpoint_auth_method: "private_key_jwt",
    token_endpoint_auth_signing_alg: "ES256",
    application_type: "web",
    dpop_bound_access_tokens: true,
    jwks_uri: `${url}/.well-known/jwks.json`,
  };

  return function GET() {
    return NextResponse.json(metadata, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  };
}

export function createJwksHandler(privateKeyJwk: string) {
  const { d: _d, ...publicKey } = JSON.parse(privateKeyJwk) as Record<string, unknown>;

  return function GET() {
    return NextResponse.json(
      { keys: [publicKey] },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  };
}
