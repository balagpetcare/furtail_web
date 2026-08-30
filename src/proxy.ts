import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // Use either the access token or refresh token presence to determine active session
  const token = request.cookies.get('furtail_access_token')?.value || request.cookies.get('furtail_refresh_token')?.value
  
  // 1. BFF Proxy Intercept: /api/proxy/* -> Furtail API
  if (request.nextUrl.pathname.startsWith('/api/proxy/')) {
    const accessToken = request.cookies.get('furtail_access_token')?.value
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const apiPath = request.nextUrl.pathname.replace(/^\/api\/proxy/, '');
    const apiUrl = `${process.env.NEXT_PUBLIC_FURTAIL_API_URL}${apiPath}${request.nextUrl.search}`;
    
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    
    return NextResponse.rewrite(apiUrl, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 2. Application Route Guards
  const isPublicPath = request.nextUrl.pathname === '/' ||
                       request.nextUrl.pathname.startsWith('/welcome') ||
                       request.nextUrl.pathname.startsWith('/api/auth') ||
                       request.nextUrl.pathname.startsWith('/login') ||
                       request.nextUrl.pathname.startsWith('/register') ||
                       request.nextUrl.pathname.startsWith('/_next') ||
                       request.nextUrl.pathname === '/favicon.ico' ||
                       // Command 5 §10 — dev/test-only E2E preview pages. The
                       // page itself also calls notFound() in production
                       // (see src/app/dev/external-ad-preview/page.tsx); this
                       // is a defense-in-depth double-gate, not the only guard.
                       (process.env.NODE_ENV !== 'production' && request.nextUrl.pathname.startsWith('/dev/'));

  if (!token && !isPublicPath) {
    if (request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/welcome', request.url))
    }
    
    const loginUrl = new URL('/login', request.url)
    
    // Redirect safety: ensure returnTo path starts with a single '/' and is relative to prevent open redirects
    let returnTo = request.nextUrl.pathname + request.nextUrl.search;
    if (returnTo.startsWith('//') || !returnTo.startsWith('/')) {
      returnTo = '/';
    }
    
    loginUrl.searchParams.set('returnTo', returnTo)
    return NextResponse.redirect(loginUrl)
  }

  if (token && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register'))) {
     return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/auth/callback|_next/static|_next/image|favicon.ico).*)'],
}
