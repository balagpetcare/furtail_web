import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCentralAuthStartUrl } from './central-auth';

test('buildCentralAuthStartUrl points at this app\'s own /api/auth/login bridge, never a WPA/provider URL directly', () => {
  const url = buildCentralAuthStartUrl('google', true);
  assert.equal(url, '/api/auth/login?method=google&popup=1');
});

test('buildCentralAuthStartUrl omits the popup flag for the full-page fallback', () => {
  const url = buildCentralAuthStartUrl('email', false);
  assert.equal(url, '/api/auth/login?method=email');
});

test('buildCentralAuthStartUrl supports the register method', () => {
  const url = buildCentralAuthStartUrl('register', true);
  assert.equal(url, '/api/auth/login?method=register&popup=1');
});
