import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  try {
    const bootstrapUrl = new URL(`${env.WPA_AUTH_API_URL}/auth/bootstrap`);
    bootstrapUrl.searchParams.set("clientId", env.WPA_CLIENT_ID);

    const res = await fetch(bootstrapUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 }, // Cache config for 60 seconds
    });

    if (!res.ok) {
      throw new Error("Failed to fetch bootstrap config");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("BFF Bootstrap Config Error:", error);
    // Return safe default config if Central Auth is down
    return NextResponse.json({
      success: true,
      data: {
        loginMethods: {
          emailPassword: true,
          phonePassword: true,
          emailOtp: true,
          phoneOtp: true,
          whatsappOtp: false,
        },
        providers: [
          { id: "google", displayName: "Google", enabled: true },
          { id: "facebook", displayName: "Facebook", enabled: true },
        ],
      },
    });
  }
}
