import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { buildSessionOptions, type SessionConfig } from "./config";
import type { AnySession, SessionData } from "./types";

export async function getSession(config: SessionConfig): Promise<AnySession> {
  const cookieStore = await cookies();
  const session = await getIronSession<AnySession>(
    cookieStore,
    buildSessionOptions(config)
  );

  if (!session.isLoggedIn) {
    return { isLoggedIn: false };
  }

  return {
    isLoggedIn: true,
    did: (session as SessionData).did,
    handle: (session as SessionData).handle,
  };
}

export async function saveSession(
  data: SessionData,
  config: SessionConfig
): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<AnySession>(
    cookieStore,
    buildSessionOptions(config)
  );

  (session as SessionData).did = data.did;
  (session as SessionData).handle = data.handle;
  (session as unknown as { isLoggedIn: boolean }).isLoggedIn = true;

  await session.save();
}

export async function clearSession(config: SessionConfig): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<AnySession>(
    cookieStore,
    buildSessionOptions(config)
  );

  session.destroy();
}
