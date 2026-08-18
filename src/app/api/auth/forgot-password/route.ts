import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    const authHeaders = {
      "Content-Type": "application/json",
      "X-Client-Secret": env.WPA_CLIENT_SECRET || "furtail-secret",
    };

    const apiResponse = await fetch(`${env.WPA_AUTH_API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        email,
        clientId: env.WPA_CLIENT_ID,
      }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData.message || "Failed to process forgot password",
        code: errorData.code || "FORGOT_PASSWORD_FAILED"
      }, { status: apiResponse.status });
    }

    const data = await apiResponse.json();
    return NextResponse.json({ success: true, message: data.message });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
