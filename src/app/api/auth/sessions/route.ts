import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("furtail_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const res = await fetch(`${env.WPA_AUTH_API_URL}/auth/sessions`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "X-Client-Secret": env.WPA_CLIENT_SECRET || "furtail-secret",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to load sessions");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Fetch Active Sessions Error:", error);
    return NextResponse.json({ error: "Failed to load active sessions" }, { status: 500 });
  }
}
