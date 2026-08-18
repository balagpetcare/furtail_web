import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'), 'utf8');

test('Furtail login page renders BPA-style branded choices: Google, Facebook, Instagram, X, Email, Create account', () => {
  assert.match(source, /Sign in to Furtail/);
  assert.match(source, /label: "Google"/);
  assert.match(source, /label: "Facebook"/);
  assert.match(source, /label: "Instagram"/);
  assert.match(source, /label: "X"/);
  assert.match(source, /Continue with Email/);
  assert.match(source, /Create account/);
  assert.doesNotMatch(source, /Continue with WPA/);
});

test('every method routes through buildCentralAuthStartUrl (this app\'s own bridge), never a provider domain directly', () => {
  assert.match(source, /buildCentralAuthStartUrl\(method, true\)/);
  assert.match(source, /buildCentralAuthStartUrl\(method, false\)/);
  assert.doesNotMatch(source, /accounts\.google\.com/);
  assert.doesNotMatch(source, /facebook\.com\/.*oauth/);
  assert.doesNotMatch(source, /api\.instagram\.com\/oauth/);
  assert.doesNotMatch(source, /x\.com\/i\/oauth2/);
});

test('popup-blocked case falls back to a full-page redirect instead of failing silently', () => {
  assert.match(source, /if \(!popup\)/);
  assert.match(source, /buildCentralAuthStartUrl\(method, false\)/);
});

test('the opener only trusts postMessage results via isTrustedCentralAuthPopupEvent (strict origin/source check)', () => {
  assert.match(source, /isTrustedCentralAuthPopupEvent\(event, window\.location\.origin, popupRef\.current\)/);
});
