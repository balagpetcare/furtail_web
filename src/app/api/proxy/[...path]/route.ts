import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "cookie",
  "transfer-encoding",
]);

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "transfer-encoding",
]);

function verifyCsrf(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host") || "";
  
  // Parse origin from WPA_REDIRECT_URI if set
  let allowedOrigin = `http://${host}`;
  if (env.WPA_REDIRECT_URI) {
    try {
      allowedOrigin = new URL(env.WPA_REDIRECT_URI).origin;
    } catch {
      // fallback to host header
    }
  }

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

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const isStateChanging = req.method !== "GET" && req.method !== "HEAD";

  // Verify CSRF for all state-changing requests
  if (isStateChanging && !verifyCsrf(req)) {
    return NextResponse.json(
      { error: { code: "CSRF_ERROR", message: "CSRF verification failed" } },
      { status: 403 },
    );
  }

  const { path } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("furtail_access_token")?.value;

  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "No active session" } },
      { status: 401 },
    );
  }

  const upstreamUrl = new URL(
    `${env.NEXT_PUBLIC_FURTAIL_API_URL}/${path.join("/")}`,
  );
  upstreamUrl.search = req.nextUrl.search;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  headers.set("Authorization", `Bearer ${token}`);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      // @ts-expect-error - required by undici when streaming a request body
      duplex: hasBody ? "half" : undefined,
      cache: "no-store",
    });
  } catch (error) {
    console.error("[API Proxy] Upstream fetch failed:", error);
    return NextResponse.json(
      { error: { code: "UPSTREAM_UNREACHABLE", message: "Furtail API is unreachable" } },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as PUT,
  proxy as DELETE,
};
