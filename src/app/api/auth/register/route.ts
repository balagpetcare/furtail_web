import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone, username, password, displayName } = body;

    const authHeaders = {
      "Content-Type": "application/json",
      "X-Client-Secret": env.WPA_CLIENT_SECRET || "furtail-secret",
    };

    const registerResponse = await fetch(`${env.WPA_AUTH_API_URL}/auth/register`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        email,
        phone,
        username,
        password,
        displayName,
        clientId: env.WPA_CLIENT_ID,
      }),
    });

    if (!registerResponse.ok) {
      const errorData = await registerResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData.message || "Registration failed",
        code: errorData.code || "REGISTRATION_FAILED"
      }, { status: registerResponse.status });
    }

    const registerData = await registerResponse.json();
    return NextResponse.json({ success: true, user: registerData.user });
  } catch (error) {
    console.error("Native Register Error:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
