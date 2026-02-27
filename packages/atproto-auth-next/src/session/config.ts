import type { SessionOptions } from "iron-session";
import type { AnySession } from "./types";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_COOKIE_NAME = "gainforest_session";

export type SessionConfig = {
  cookieSecret: string;
  cookieName?: string;
  secure?: boolean;
};

export function buildSessionOptions({
  cookieSecret,
  cookieName = DEFAULT_COOKIE_NAME,
  secure,
}: SessionConfig): SessionOptions {
  if (cookieSecret.length < 32) {
    throw new Error("cookieSecret must be at least 32 characters");
  }

  return {
    password: cookieSecret,
    cookieName,
    cookieOptions: {
      httpOnly: true,
      secure: secure ?? process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: COOKIE_MAX_AGE_SECONDS,
      path: "/",
    },
  };
}

export type { AnySession, SessionOptions };
