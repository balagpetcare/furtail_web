import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

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
  const accessToken = cookieStore.get("furtail_access_token")?.value;
  const refreshToken = cookieStore.get("furtail_refresh_token")?.value;

  if (accessToken) {
    try {
      await fetch(`${env.WPA_AUTH_API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "X-Client-Secret": env.WPA_CLIENT_SECRET || "furtail-secret",
        },
        body: JSON.stringify({
          refreshToken,
        }),
      });
    } catch (error) {
      console.error("Failed to revoke session on WPA Central Auth:", error);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("furtail_access_token");
  response.cookies.delete("furtail_refresh_token");
  response.cookies.delete("oauth_state");
  response.cookies.delete("oauth_code_verifier");
  return response;
}
