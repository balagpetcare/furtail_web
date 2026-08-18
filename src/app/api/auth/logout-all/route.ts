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

  if (!accessToken) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const apiResponse = await fetch(`${env.WPA_AUTH_API_URL}/auth/sessions/logout-others`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "X-Client-Secret": env.WPA_CLIENT_SECRET || "furtail-secret",
      },
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData.message || "Failed to log out other devices",
        code: errorData.code || "LOGOUT_OTHERS_FAILED"
      }, { status: apiResponse.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout Others Device Error:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
