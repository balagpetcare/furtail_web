import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const { action, channel, recipient, code } = await request.json();

    if (!action || !channel || !recipient) {
      return NextResponse.json({ success: false, error: "Action, channel, and recipient are required" }, { status: 400 });
    }

    const authHeaders = {
      "Content-Type": "application/json",
      "X-Client-Secret": env.WPA_CLIENT_SECRET || "furtail-secret",
    };

    if (action === "request") {
      const apiResponse = await fetch(`${env.WPA_AUTH_API_URL}/auth/otp/request`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          channel,
          recipient,
          clientId: env.WPA_CLIENT_ID,
        }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({}));
        return NextResponse.json({
          success: false,
          error: errorData.message || "Failed to request OTP",
          code: errorData.code || "OTP_REQUEST_FAILED"
        }, { status: apiResponse.status });
      }

      const data = await apiResponse.json();
      return NextResponse.json({ 
        success: true, 
        message: data.message,
        expiresInSeconds: data.expiresInSeconds,
        resendCooldownSeconds: data.resendCooldownSeconds
      });
    }

    if (action === "verify") {
      if (!code) {
        return NextResponse.json({ success: false, error: "Verification code is required" }, { status: 400 });
      }

      const apiResponse = await fetch(`${env.WPA_AUTH_API_URL}/auth/otp/verify`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          channel,
          recipient,
          code,
          clientId: env.WPA_CLIENT_ID,
        }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({}));
        return NextResponse.json({
          success: false,
          error: errorData.message || "Invalid or expired OTP",
          code: errorData.code || "OTP_INVALID"
        }, { status: apiResponse.status });
      }

      const authData = await apiResponse.json();
      const accessToken = authData.accessToken;
      const refreshToken = authData.refreshToken;

      // Call Furtail API Profile Bootstrap
      const bootstrapResponse = await fetch(`${env.NEXT_PUBLIC_FURTAIL_API_URL}/auth/me`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        }
      });

      if (!bootstrapResponse.ok) {
        console.error("Furtail profile bootstrap failed during OTP login", await bootstrapResponse.text());
        return NextResponse.json({ success: false, error: "Profile bootstrap failed" }, { status: 500 });
      }

      const response = NextResponse.json({ success: true, user: authData.user });
      const isProd = process.env.NODE_ENV === "production";

      response.cookies.set("furtail_access_token", accessToken, {
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
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("OTP API Error:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
