import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const { provider, idToken, accessToken } = await request.json();

    if (!provider || (!idToken && !accessToken)) {
      return NextResponse.json({ success: false, error: "Provider and token are required" }, { status: 400 });
    }

    const authHeaders = {
      "Content-Type": "application/json",
      "X-Client-Secret": env.WPA_CLIENT_SECRET || "furtail-secret",
    };

    const apiResponse = await fetch(`${env.WPA_AUTH_API_URL}/auth/identity/${provider}`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        idToken,
        accessToken,
        clientId: env.WPA_CLIENT_ID,
      }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData.message || "Identity login failed",
        code: errorData.code || "IDENTITY_LOGIN_FAILED"
      }, { status: apiResponse.status });
    }

    const authData = await apiResponse.json();
    const token = authData.accessToken;
    const refreshToken = authData.refreshToken;

    // Call Furtail API Profile Bootstrap
    const bootstrapResponse = await fetch(`${env.NEXT_PUBLIC_FURTAIL_API_URL}/auth/me`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      }
    });

    if (!bootstrapResponse.ok) {
      console.error("Furtail profile bootstrap failed during identity login", await bootstrapResponse.text());
      return NextResponse.json({ success: false, error: "Profile bootstrap failed" }, { status: 500 });
    }

    const response = NextResponse.json({ success: true, user: authData.user });
    const isProd = process.env.NODE_ENV === "production";

    response.cookies.set("furtail_access_token", token, {
      httpOnly: true,
      secure: isProd,
      path: "/",
      maxAge: authData.expiresIn || 3600,
      sameSite: "lax",
    });

    if (refreshToken) {
      response.cookies.set("furtail_refresh_token", refreshToken, {
        httpOnly: true,
        secure: isProd,
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        sameSite: "lax",
      });
    }

    return response;
  } catch (error) {
    console.error("Identity Login Error:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
