import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import crypto from "crypto";

const SOCIAL_METHODS = new Set(["google", "facebook", "instagram", "x"]);
const ALLOWED_METHODS = new Set(["google", "facebook", "instagram", "x", "email", "register"]);

function buildAuthorizeUrl(method: string, state: string, codeChallenge: string): string {
  const redirectUri = env.WPA_REDIRECT_URI;
  const clientId = env.WPA_CLIENT_ID;

  if (SOCIAL_METHODS.has(method)) {
    const url = new URL(`${env.WPA_AUTH_API_URL}/auth/social/${method}/start`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
  }

  const oauthQuery = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  if (method === "email") {
    oauthQuery.set("auth_method", "email");
    return `${env.NEXT_PUBLIC_WPA_AUTH_WEB_URL}/oauth/authorize?${oauthQuery.toString()}`;
  }

  // register: hosted registration page, continuing back into /oauth/authorize on success.
  const next = `/oauth/authorize?${oauthQuery.toString()}`;
  const registerUrl = new URL(`${env.NEXT_PUBLIC_WPA_AUTH_WEB_URL}/auth/register`);
  registerUrl.searchParams.set("next", next);
  return registerUrl.toString();
}

// GET is used for the OAuth authorize redirect flow
export async function GET(request: Request) {
  const url = new URL(request.url);
  const method = url.searchParams.get("method") ?? "email";
  const popup = url.searchParams.get("popup") === "1";

  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Unsupported method." } }, { status: 400 });
  }

  const state = crypto.randomBytes(16).toString("hex");

  // Generate PKCE code verifier and challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  const authUrl = buildAuthorizeUrl(method, state, codeChallenge);

  const response = NextResponse.redirect(authUrl);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
    sameSite: 'lax' as const,
  };

  response.cookies.set("oauth_state", state, cookieOptions);
  response.cookies.set("oauth_code_verifier", codeVerifier, cookieOptions);
  response.cookies.set("oauth_popup", popup ? "1" : "0", cookieOptions);

  return response;
}

// POST is used for headless first-party credentials-based authentication
//
// PHONE IDENTIFIER STRATEGY:
// Both /auth/login/phone (exact phone match) and /auth/login (emailOrUsername,
// which searches username + email + phone via OR) exist on Central Auth.
// Accounts may be stored with different phone formats:
//   - Canonical local:  01712345678  (11 digits, 01x prefix)
//   - Legacy alternate: +8801712345678  (E.164 Bangladesh)
//
// This BFF mirrors the mobile app's strategy:
//   1. If the identifier looks like a phone, try /auth/login/phone first.
//   2. On INVALID_CREDENTIALS 401 from that path, retry with the alternate
//      Bangladesh format (+880...) — legacy accounts registered before the
//      canonical format was enforced.
//   3. If the identifier looks like email/username, use /auth/login directly
//      (which already OR-matches username, email, and phone columns).
//
// PROFILE BOOTSTRAP:
// The Furtail App API /auth/me call provisions/confirms the local user row.
// On transient failure (network, app API restart) it is treated as non-fatal:
// session cookies are still set and the client navigates in — the profile can
// be loaded on the next request. A hard auth failure (non-recoverable) still
// blocks login.

/** Normalize a raw local BD phone (01XXXXXXXXXX) to the E.164 alternate form (+880XXXXXXXXXX). */
function toAlternateBDPhone(canonical: string): string | null {
  const digits = canonical.replace(/\D/g, "");
  // 01XXXXXXXXXX → +880 1XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith("01")) {
    return `+880${digits.substring(1)}`;
  }
  // +8801XXXXXXXXXX → 01XXXXXXXXXX (reverse alternate → canonical)
  if (digits.length === 13 && digits.startsWith("880")) {
    return `0${digits.substring(3)}`;
  }
  return null;
}

/** Attempt a Central Auth credential login and return the raw fetch Response. */
async function attemptCentralAuthLogin(
  identifier: string,
  password: string,
  authHeaders: Record<string, string>,
): Promise<Response> {
  return fetch(`${env.WPA_AUTH_API_URL}/auth/login`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      emailOrUsername: identifier,
      password,
      clientId: env.WPA_CLIENT_ID,
    }),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, password } = body;
    const emailOrUsername: string | undefined = body.emailOrUsername;

    if (!password) {
      return NextResponse.json({ success: false, error: "Password is required" }, { status: 400 });
    }

    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Client-Secret": env.WPA_CLIENT_SECRET || "furtail-secret",
    };

    // Determine the primary identifier and whether it is a phone number
    const isPhonePath = Boolean(phone);
    const primaryIdentifier: string = isPhonePath ? phone : emailOrUsername || "";

    if (!primaryIdentifier) {
      return NextResponse.json({ success: false, error: "Email, phone number, or username is required" }, { status: 400 });
    }

    // --- First attempt ---
    let authResponse = await attemptCentralAuthLogin(primaryIdentifier, password, authHeaders);

    // --- Phone fallback (mirrors mobile app behaviour) ---
    // If the phone-path returned INVALID_CREDENTIALS, retry once with the
    // alternate Bangladesh format.  Some accounts were registered before the
    // canonical local format (01XXXXXXXXXX) was enforced and are stored as
    // +880XXXXXXXXXX, or vice-versa.
    if (isPhonePath && authResponse.status === 401) {
      let errorCode: string | undefined;
      try {
        const errJson = await authResponse.clone().json();
        errorCode = errJson?.code;
      } catch {
        // ignore parse errors
      }

      if (errorCode === "INVALID_CREDENTIALS") {
        const alternate = toAlternateBDPhone(primaryIdentifier);
        if (alternate) {
          console.log(`[BFF login] Phone lookup failed, retrying with alternate format: ${alternate}`);
          authResponse = await attemptCentralAuthLogin(alternate, password, authHeaders);
        }
      }
    }

    if (!authResponse.ok) {
      const errorData = await authResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: errorData.message || "Invalid credentials",
        code: errorData.code || "INVALID_CREDENTIALS",
      }, { status: authResponse.status });
    }

    const authData = await authResponse.json();
    const accessToken: string = authData.accessToken;
    const refreshToken: string | undefined = authData.refreshToken;

    if (!accessToken) {
      console.error("[BFF login] Central Auth returned 200 but no accessToken:", JSON.stringify(authData));
      return NextResponse.json({ success: false, error: "Authentication service returned an invalid response" }, { status: 502 });
    }

    // --- Profile bootstrap (non-fatal) ---
    // Provisions the Furtail-side user row and confirms the account exists
    // locally. Network failures or temporary unavailability are treated as
    // non-fatal so the user can still sign in. A clean 4xx (e.g. 403
    // audience mismatch) IS considered fatal since it indicates a config
    // problem that won't resolve on its own.
    let bootstrapUser: Record<string, unknown> | null = null;
    try {
      const bootstrapResponse = await fetch(`${env.NEXT_PUBLIC_FURTAIL_API_URL}/auth/me`, {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });

      if (bootstrapResponse.ok) {
        const bootstrapData = await bootstrapResponse.json().catch(() => null);
        bootstrapUser = bootstrapData?.data?.user ?? bootstrapData?.user ?? null;
      } else if (bootstrapResponse.status >= 400 && bootstrapResponse.status < 500) {
        // Hard client error — likely audience or permission problem
        const errorText = await bootstrapResponse.text().catch(() => "");
        console.error(`[BFF login] Profile bootstrap hard failure ${bootstrapResponse.status}:`, errorText);
        return NextResponse.json({
          success: false,
          error: "Your account is not authorized for Furtail. Please contact support.",
          code: "PROFILE_UNAUTHORIZED",
        }, { status: 403 });
      } else {
        // 5xx / network — non-fatal; user still gets signed in
        const errorText = await bootstrapResponse.text().catch(() => "");
        console.warn(`[BFF login] Profile bootstrap soft failure ${bootstrapResponse.status}:`, errorText);
      }
    } catch (bootstrapErr) {
      // Network/ECONNREFUSED — non-fatal
      console.warn("[BFF login] Profile bootstrap fetch threw (non-fatal):", bootstrapErr);
    }

    // --- Issue session cookies ---
    const isProd = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      path: "/",
      sameSite: "lax" as const,
    };

    const response = NextResponse.json({
      success: true,
      user: bootstrapUser ?? authData.user,
    });

    response.cookies.set("furtail_access_token", accessToken, {
      ...cookieOptions,
      maxAge: typeof authData.expiresIn === "number" ? authData.expiresIn : 3600,
    });

    if (refreshToken) {
      response.cookies.set("furtail_refresh_token", refreshToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error("Native Login Error:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
