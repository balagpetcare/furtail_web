import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/app/(auth)/popup-complete/page.tsx'), 'utf8');

test('popup-complete page derives success from a plain query flag, never re-fetches or carries a token', () => {
  assert.match(source, /searchParams\.get\("success"\) === "1"/);
  assert.doesNotMatch(source, /access_token/);
  assert.doesNotMatch(source, /fetch\(/);
});

test('popup-complete page publishes only {type, success, issuedAt} to the opener and self-closes', () => {
  assert.match(source, /publishCentralAuthPopupResult\(success, window\.location\.origin\)/);
  assert.match(source, /window\.close\(\)/);
});

test('popup-complete page shows a clear failure message with no technical detail leaked', () => {
  assert.match(source, /Couldn&apos;t complete sign-in/);
});
