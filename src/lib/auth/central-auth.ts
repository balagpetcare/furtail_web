export type CentralAuthMethod = 'google' | 'facebook' | 'instagram' | 'x' | 'email' | 'register';

/**
 * Starts the Authorization Code + PKCE flow against this app's own
 * /api/auth/login route (see app/api/auth/login/route.ts). Popup is only a
 * UX wrapper around the same flow furtail_web already used for its single
 * "Continue with WPA" button — no separate popup protocol.
 */
export function buildCentralAuthStartUrl(method: CentralAuthMethod, popup: boolean): string {
  const params = new URLSearchParams({ method });
  if (popup) params.set('popup', '1');
  return `/api/auth/login?${params.toString()}`;
}
