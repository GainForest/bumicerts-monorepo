import { Agent } from "@atproto/api";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import type { SessionData } from "./session/types";

export type AgentError =
  | { code: "UNAUTHENTICATED" }
  | { code: "SESSION_EXPIRED" };

type AgentResult<T> =
  | { ok: true; agent: T }
  | { ok: false; error: AgentError };

export function getReadAgent(serviceUrl: string): Agent {
  return new Agent(new URL(serviceUrl));
}

export async function getWriteAgent(
  client: NodeOAuthClient,
  session: SessionData
): Promise<AgentResult<Agent>> {
  const oauthSession = await client.restore(session.did);

  if (!oauthSession) {
    return { ok: false, error: { code: "SESSION_EXPIRED" } };
  }

  return { ok: true, agent: new Agent(oauthSession) };
}

export { Agent };
