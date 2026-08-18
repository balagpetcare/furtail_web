import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ success: false, error: "Token is required" }, { status: 400 });
    }

    const authHeaders = {
      "Content-Type": "application/json",
      "X-Client-Secret": env.WPA_CLIENT_SECRET || "furtail-secret",
    };

    const apiResponse = await fetch(`${env.WPA_AUTH_API_URL}/auth/verify-email/confirm`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        token,
      }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData.message || "Email verification failed",
        code: errorData.code || "EMAIL_VERIFICATION_FAILED"
      }, { status: apiResponse.status });
    }

    const data = await apiResponse.json();
    return NextResponse.json({ success: true, message: data.message });
  } catch (error) {
    console.error("Email Verification Error:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
