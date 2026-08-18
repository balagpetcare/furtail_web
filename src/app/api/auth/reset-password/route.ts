import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ success: false, error: "Token and password are required" }, { status: 400 });
    }

    const authHeaders = {
      "Content-Type": "application/json",
      "X-Client-Secret": env.WPA_CLIENT_SECRET || "furtail-secret",
    };

    const apiResponse = await fetch(`${env.WPA_AUTH_API_URL}/auth/reset-password`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        token,
        password,
      }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData.message || "Failed to reset password",
        code: errorData.code || "RESET_PASSWORD_FAILED"
      }, { status: apiResponse.status });
    }

    const data = await apiResponse.json();
    return NextResponse.json({ success: true, message: data.message });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
