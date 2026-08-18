import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("furtail_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const res = await fetch(`${env.WPA_AUTH_API_URL}/auth/sessions/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "X-Client-Secret": env.WPA_CLIENT_SECRET || "furtail-secret",
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: errorData.message || "Failed to revoke session",
        code: errorData.code || "REVOKE_SESSION_FAILED"
      }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke Session Error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
