import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { cookies } from "next/headers";

function popupCompleteRedirect(request: Request, success: boolean): NextResponse {
  const url = new URL("/popup-complete", request.url);
  url.searchParams.set("success", success ? "1" : "0");
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  const codeVerifier = cookieStore.get("oauth_code_verifier")?.value;
  const popup = cookieStore.get("oauth_popup")?.value === "1";

  if (!code || state !== storedState || !codeVerifier) {
    return popup
      ? popupCompleteRedirect(request, false)
      : NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }

  try {
    const tokenResponse = await fetch(`${env.WPA_AUTH_API_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: env.WPA_CLIENT_ID,
        client_secret: env.WPA_CLIENT_SECRET,
        code,
        redirect_uri: env.WPA_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error("Token Exchange Failed:", errorBody);
      throw new Error("Failed to exchange token");
    }

    const data = await tokenResponse.json();
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;

    // Call Furtail API Profile Bootstrap
    const bootstrapResponse = await fetch(`${env.NEXT_PUBLIC_FURTAIL_API_URL}/auth/me`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      }
    });

    if (!bootstrapResponse.ok) {
      console.error("Furtail profile bootstrap failed", await bootstrapResponse.text());
      throw new Error("Profile bootstrap failed");
    }

    const response = popup ? popupCompleteRedirect(request, true) : NextResponse.redirect(new URL("/", request.url));

    response.cookies.set("furtail_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: data.expires_in || 3600,
      sameSite: "lax",
    });

    if (refreshToken) {
      response.cookies.set("furtail_refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        sameSite: "lax",
      });
    }

    response.cookies.delete("oauth_state");
    response.cookies.delete("oauth_code_verifier");
    response.cookies.delete("oauth_popup");

    return response;
  } catch (error) {
    console.error("Auth Callback Error:", error);
    return popup
      ? popupCompleteRedirect(request, false)
      : NextResponse.redirect(new URL("/login?error=callback_failed", request.url));
  }
}
