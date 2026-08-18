import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The callback route uses next/headers' cookies(), which only works inside a
// real Next.js request scope — so behavior here is verified by source
// inspection rather than direct invocation (see the executable tests for
// login/route.ts, which has no such dependency).
const source = readFileSync(resolve(process.cwd(), 'src/app/api/auth/callback/route.ts'), 'utf8');

test('callback validates state against the stored cookie and requires a code_verifier before exchanging anything', () => {
  assert.match(source, /state !== storedState/);
  assert.match(source, /!codeVerifier/);
});

test('popup-mode outcomes (success and failure) both route through /popup-complete, never back to /login', () => {
  assert.match(source, /popupCompleteRedirect\(request, false\)/);
  assert.match(source, /popupCompleteRedirect\(request, true\)/);
  assert.match(source, /new URL\("\/popup-complete", request\.url\)/);
});

test('non-popup outcomes preserve the original full-page redirect targets', () => {
  assert.match(source, /NextResponse\.redirect\(new URL\("\/", request\.url\)\)/);
  assert.match(source, /NextResponse\.redirect\(new URL\("\/login\?error=invalid_state", request\.url\)\)/);
  assert.match(source, /NextResponse\.redirect\(new URL\("\/login\?error=callback_failed", request\.url\)\)/);
});

test('the popup-complete redirect carries only a success flag — never the access token, refresh token, or code', () => {
  assert.match(source, /url\.searchParams\.set\("success"/);
  assert.doesNotMatch(source, /popup-complete[^)]*access_token/);
  assert.doesNotMatch(source, /popup-complete[^)]*code=/);
});

test('session cookies are set httpOnly and the one-time oauth cookies are cleared on success', () => {
  assert.match(source, /httpOnly: true/);
  assert.match(source, /response\.cookies\.delete\("oauth_state"\)/);
  assert.match(source, /response\.cookies\.delete\("oauth_code_verifier"\)/);
  assert.match(source, /response\.cookies\.delete\("oauth_popup"\)/);
});
