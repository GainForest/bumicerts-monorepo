import crypto from "crypto";
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = [
  '/client-metadata.json',
  '/.well-known/jwks.json',
  '/api/oauth/callback',
  '/api/oauth/epds/login',
  '/api/oauth/epds/callback',
  '/robots.txt',
  '/assets/email/otp-template.html',
  '/assets/media/images/logo.png',
];

function computeHmac(username: string, password: string): string {
  return crypto.createHmac("sha256", `${username}:${password}`).update("preprod-gate").digest("hex");
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route.includes('.')) {
      // Exact match for file-like routes
      return pathname === route;
    }
    return pathname.startsWith(route);
  });
}

export function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Step 1: Existing localhost redirect (must run first)
  if (hostname.startsWith('localhost:')) {
    const newHost = hostname.replace('localhost', '127.0.0.1');
    const redirectUrl = new URL(request.url);
    redirectUrl.hostname = '127.0.0.1';
    redirectUrl.port = newHost.split(':')[1] || '3000';
    return NextResponse.redirect(redirectUrl, { status: 307 });
  }

  const preprodPassword = process.env.PREPROD_PASSWORD;
  const preprodUsername = process.env.PREPROD_USERNAME;

  // Step 2: Gate disabled check
  if (!preprodPassword || !preprodUsername || process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // Step 3: Public route whitelist check
  const pathname = request.nextUrl.pathname;
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const expectedHmac = computeHmac(preprodUsername, preprodPassword);

  // Step 4: Cookie check
  const cookieValue = request.cookies.get("preprod-access")?.value;
  if (cookieValue) {
    try {
      const cookieBuf = Buffer.from(cookieValue);
      const expectedBuf = Buffer.from(expectedHmac);
      if (
        cookieBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(cookieBuf, expectedBuf)
      ) {
        return NextResponse.next();
      }
    } catch {
      // Invalid cookie value — fall through to Basic Auth check
    }
  }

  // Step 5: Basic Auth header check
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Basic ")) {
    try {
      const base64 = authHeader.slice("Basic ".length);
      const decoded = Buffer.from(base64, "base64").toString("utf-8");
      const colonIndex = decoded.indexOf(":");
      const username = colonIndex >= 0 ? decoded.slice(0, colonIndex) : "";
      const password = colonIndex >= 0 ? decoded.slice(colonIndex + 1) : decoded;

      const usernameBuf = Buffer.from(username);
      const expectedUsernameBuf = Buffer.from(preprodUsername);
      const passwordBuf = Buffer.from(password);
      const expectedPasswordBuf = Buffer.from(preprodPassword);

      if (
        usernameBuf.length === expectedUsernameBuf.length &&
        crypto.timingSafeEqual(usernameBuf, expectedUsernameBuf) &&
        passwordBuf.length === expectedPasswordBuf.length &&
        crypto.timingSafeEqual(passwordBuf, expectedPasswordBuf)
      ) {
        const response = NextResponse.next();
        response.cookies.set("preprod-access", computeHmac(username, password), {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
        return response;
      }
    } catch {
      // Malformed auth header — fall through to 401
    }
  }

  // Step 6: 401 response
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="Pre-production access", charset="UTF-8"`,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
