import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from './login/route';

function cookieMap(res: Response): Record<string, string> {
  const raw = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  const map: Record<string, string> = {};
  for (const entry of raw) {
    const [pair] = entry.split(';');
    const [key, value] = pair.split('=');
    map[key] = value;
  }
  return map;
}

test('rejects an unsupported method with 400, before setting any cookie or redirecting', async () => {
  const res = await GET(new Request('http://localhost:7400/api/auth/login?method=tiktok'));
  assert.equal(res.status, 400);
  assert.equal(res.headers.get('location'), null);
});

test('social methods (google/facebook/instagram/x) redirect straight to wpa_auth_api social start with PKCE + client params, never a provider domain', async () => {
  for (const method of ['google', 'facebook', 'instagram', 'x']) {
    const res = await GET(new Request(`http://localhost:7400/api/auth/login?method=${method}&popup=1`));
    const location = new URL(res.headers.get('location')!);
    assert.equal(location.origin + location.pathname, `http://localhost:5010/api/v1/auth/social/${method}/start`);
    assert.equal(location.searchParams.get('client_id'), 'furtail-web');
    assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(location.searchParams.get('code_challenge'));
    assert.ok(location.searchParams.get('state'));

    const cookies = cookieMap(res);
    assert.ok(cookies['oauth_state']);
    assert.ok(cookies['oauth_code_verifier']);
    assert.equal(cookies['oauth_popup'], '1');
  }
});

test('email method redirects to the WPA hosted authorize page in email-only mode', async () => {
  const res = await GET(new Request('http://localhost:7400/api/auth/login?method=email'));
  const location = new URL(res.headers.get('location')!);
  assert.equal(location.origin + location.pathname, 'http://localhost:5011/oauth/authorize');
  assert.equal(location.searchParams.get('auth_method'), 'email');
  assert.equal(location.searchParams.get('response_type'), 'code');
  const cookies = cookieMap(res);
  assert.equal(cookies['oauth_popup'], '0');
});

test('register method redirects to the WPA hosted register page with an /oauth/authorize continuation', async () => {
  const res = await GET(new Request('http://localhost:7400/api/auth/login?method=register&popup=1'));
  const location = new URL(res.headers.get('location')!);
  assert.equal(location.origin + location.pathname, 'http://localhost:5011/auth/register');
  const next = location.searchParams.get('next')!;
  assert.match(next, /^\/oauth\/authorize\?/);
  assert.match(next, /client_id=furtail-web/);
});

test('omitting popup defaults to a non-popup (full-page) flow', async () => {
  const res = await GET(new Request('http://localhost:7400/api/auth/login?method=google'));
  const cookies = cookieMap(res);
  assert.equal(cookies['oauth_popup'], '0');
});
