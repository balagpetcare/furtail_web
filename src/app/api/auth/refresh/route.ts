import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// In-memory token cache to prevent concurrent refresh races triggering double-rotation reuse detection.
interface TokenCache {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  rotatedAt: number;
}
const refreshCache = new Map<string, TokenCache>();

// Periodically clean up old cache entries
if (typeof globalThis !== 'undefined') {
  const g = globalThis as any;
  if (!g.refreshCacheCleanupInterval) {
    g.refreshCacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, val] of refreshCache.entries()) {
        if (now - val.rotatedAt > 60_000) {
          refreshCache.delete(key);
        }
      }
    }, 30_000);
    if (g.refreshCacheCleanupInterval.unref) {
      g.refreshCacheCleanupInterval.unref();
    }
  }
}

function verifyCsrf(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host") || "";
  const allowedOrigin = env.WPA_REDIRECT_URI ? new URL(env.WPA_REDIRECT_URI).origin : `http://${host}`;

  if (origin && origin !== allowedOrigin) return false;
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (refOrigin !== allowedOrigin) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export async function POST(request: Request) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "CSRF verification failed" }, { status: 403 });
  }

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("furtail_refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  // Check if this token was recently rotated in a concurrent request (within last 10s)
  const cached = refreshCache.get(refreshToken);
  if (cached && (Date.now() - cached.rotatedAt) < 10_000) {
    console.log("Concurrent refresh race detected. Serving rotated credentials from cache.");
    
    const response = NextResponse.json({ success: true });
    const isProd = process.env.NODE_ENV === "production";
    
    response.cookies.set("furtail_access_token", cached.accessToken, {
      httpOnly: true,
      secure: isProd,
      path: "/",
      maxAge: cached.expiresIn || 3600,
      sameSite: "lax",
    });

    if (cached.refreshToken) {
      response.cookies.set("furtail_refresh_token", cached.refreshToken, {
        httpOnly: true,
        secure: isProd,
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        sameSite: "lax",
      });
    }

    return response;
  }

  try {
    const tokenResponse = await fetch(`${env.WPA_AUTH_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Client-Secret": env.WPA_CLIENT_SECRET || "furtail-secret",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: env.WPA_CLIENT_ID,
        client_secret: env.WPA_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await tokenResponse.json();
    const accessToken = data.access_token || data.accessToken;
    const newRefreshToken = data.refresh_token || data.refreshToken;
    const expiresIn = data.expires_in || data.expiresIn;

    // Cache the rotation mapping to satisfy any other concurrent requests
    refreshCache.set(refreshToken, {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
      rotatedAt: Date.now()
    });

    const response = NextResponse.json({ success: true });
    const isProd = process.env.NODE_ENV === "production";

    response.cookies.set("furtail_access_token", accessToken, {
      httpOnly: true,
      secure: isProd,
      path: "/",
      maxAge: expiresIn || 3600,
      sameSite: "lax",
    });

    if (newRefreshToken) {
      response.cookies.set("furtail_refresh_token", newRefreshToken, {
        httpOnly: true,
        secure: isProd,
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        sameSite: "lax",
      });
    }

    return response;
  } catch (error) {
    console.error("Refresh Token Error:", error);
    // Revoke local session if refresh fails permanently
    const response = NextResponse.json({ error: "Refresh failed" }, { status: 401 });
    response.cookies.delete("furtail_access_token");
    response.cookies.delete("furtail_refresh_token");
    return response;
  }
}
