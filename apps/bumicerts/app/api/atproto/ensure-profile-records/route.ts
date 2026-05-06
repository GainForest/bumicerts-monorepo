import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureEmptyProfileRecords } from "@/lib/atproto/ensure-empty-profile-records";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasDidSession(session: unknown): session is { did: string } {
  return isRecord(session) && typeof session.did === "string";
}

export async function POST() {
  const session = await auth.session.getSession();
  if (!hasDidSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oauthSession = await auth.session.restoreSession(session.did);
  if (!oauthSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await ensureEmptyProfileRecords({
      did: session.did,
      session: oauthSession,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to ensure profile records";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
