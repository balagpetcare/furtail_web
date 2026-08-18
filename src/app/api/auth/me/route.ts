import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function GET() {
  const cookieStore = await cookies();
  let token = cookieStore.get("furtail_access_token")?.value;
  const refreshToken = cookieStore.get("furtail_refresh_token")?.value;

  if (!token && !refreshToken) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Helper function to call the profile bootstrap/me endpoint
  const getProfile = async (accessToken: string) => {
    return fetch(`${env.NEXT_PUBLIC_FURTAIL_API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  };

  try {
    let res = null;
    
    if (token) {
      res = await getProfile(token);
    }

    // If access token is missing or expired (401), try transparent refresh
    if ((!res || res.status === 401) && refreshToken) {
      console.log("Access token expired/missing, attempting transparent refresh...");
      
      const refreshResponse = await fetch(`${env.WPA_AUTH_API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Secret": env.WPA_CLIENT_SECRET || "furtail-secret",
        },
        body: JSON.stringify({
          refreshToken,
          clientId: env.WPA_CLIENT_ID,
        }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const newAccessToken = refreshData.accessToken;
        const newRefreshToken = refreshData.refreshToken;

        // Try getting profile again with the newly rotated access token
        res = await getProfile(newAccessToken);

        if (res.ok) {
          const userData = await res.json();
          const response = NextResponse.json({ user: userData });

          const isProd = process.env.NODE_ENV === "production";
          response.cookies.set("furtail_access_token", newAccessToken, {
            httpOnly: true,
            secure: isProd,
            path: "/",
            maxAge: refreshData.expiresIn || 3600,
            sameSite: "lax",
          });

          if (newRefreshToken) {
            response.cookies.set("furtail_refresh_token", newRefreshToken, {
              httpOnly: true,
              secure: isProd,
              path: "/",
              maxAge: 30 * 24 * 60 * 60,
              sameSite: "lax",
            });
          }

          return response;
        }
      }

      // If refresh failed or profile load failed after refresh:
      const response = NextResponse.json({ user: null }, { status: 401 });
      response.cookies.delete("furtail_access_token");
      response.cookies.delete("furtail_refresh_token");
      return response;
    }

    if (!res || !res.ok) {
      throw new Error("Invalid session");
    }

    const data = await res.json();
    return NextResponse.json({ user: data });
  } catch (error) {
    const response = NextResponse.json({ user: null }, { status: 401 });
    response.cookies.delete("furtail_access_token");
    response.cookies.delete("furtail_refresh_token");
    return response;
  }
}
