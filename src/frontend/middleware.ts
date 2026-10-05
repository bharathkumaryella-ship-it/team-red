import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const apiOrigin = new URL(
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  ).origin;
  const isDev = process.env.NODE_ENV !== 'production';

  const scriptDirectives = isDev
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'`;

  const directives = [
    "default-src 'self'",
    scriptDirectives,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} ws: wss:`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (!isDev) {
    directives.push('upgrade-insecure-requests');
  }

  const contentSecurityPolicy = directives.join('; ');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
