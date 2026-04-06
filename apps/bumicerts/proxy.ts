import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Redirect localhost to 127.0.0.1 (required for ATProto OAuth loopback)
  if (hostname.startsWith('localhost:')) {
    const redirectUrl = new URL(request.url);
    redirectUrl.hostname = '127.0.0.1';
    redirectUrl.port = hostname.split(':')[1] || '3000';
    return NextResponse.redirect(redirectUrl, { status: 307 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
