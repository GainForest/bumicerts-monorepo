import { NodeOAuthClient } from "@atproto/oauth-client-node";
import type { NodeOAuthClientOptions } from "@atproto/oauth-client-node";

export type OAuthClientConfig = {
  publicUrl: string;
  privateKeyJwk: string;
  stateStore: NodeOAuthClientOptions["stateStore"];
  sessionStore: NodeOAuthClientOptions["sessionStore"];
};

export function createOAuthClient({
  publicUrl,
  privateKeyJwk,
  stateStore,
  sessionStore,
}: OAuthClientConfig): NodeOAuthClient {
  const url = publicUrl.replace(/\/$/, "");

  return new NodeOAuthClient({
    clientMetadata: {
      client_id: `${url}/client-metadata.json`,
      client_name: "Gainforest",
      client_uri: url,
      redirect_uris: [`${url}/api/oauth/callback`],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: "atproto",
      token_endpoint_auth_method: "private_key_jwt",
      token_endpoint_auth_signing_alg: "ES256",
      application_type: "web",
      dpop_bound_access_tokens: true,
      jwks_uri: `${url}/.well-known/jwks.json`,
    },
    keyset: [JSON.parse(privateKeyJwk)],
    stateStore,
    sessionStore,
  });
}

export { NodeOAuthClient };
export type { NodeOAuthClientOptions };
