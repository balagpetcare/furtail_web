import test from 'node:test';
import assert from 'node:assert/strict';
import { getMediaUrl } from './media';

test('getMediaUrl helper handles empty, null, and undefined values defensively', () => {
  assert.strictEqual(getMediaUrl(undefined), undefined);
  assert.strictEqual(getMediaUrl(null), undefined);
  assert.strictEqual(getMediaUrl('undefined'), undefined);
  assert.strictEqual(getMediaUrl('null'), undefined);
  assert.strictEqual(getMediaUrl(''), undefined);
});

test('getMediaUrl preserves absolute HTTP URLs', () => {
  const absoluteUrl = 'https://s3.amazonaws.com/my-bucket/pic.jpg';
  assert.strictEqual(getMediaUrl(absoluteUrl), absoluteUrl);
});

test('getMediaUrl formats relative media store paths against API base URL', () => {
  const relativePath = '/uploads/avatar.jpg';
  const url = getMediaUrl(relativePath);
  assert.match(url || '', /http:\/\/localhost:7300/);
  assert.match(url || '', /\/uploads\/avatar\.jpg/);
});
