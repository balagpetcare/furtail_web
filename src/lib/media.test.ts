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

test('getMediaUrl resolves the real canonical /api/v1/media/<storageKey> path returned by the upload/serving contract to the correct API origin', () => {
  // Exact shape confirmed against the live backend (buildMediaPublicUrl in
  // media-storage.ts): "/api/v1/media/<ownerId>/<ts-uuid>/<filename>".
  const canonicalPath = '/api/v1/media/42/1787081076184-b53c9d76-87e/photo.jpg';
  const url = getMediaUrl(canonicalPath);
  assert.strictEqual(url, 'http://localhost:7300/api/v1/media/42/1787081076184-b53c9d76-87e/photo.jpg');
});

test('getMediaUrl passes blob: preview URLs through completely unchanged', () => {
  const blobUrl = 'blob:http://localhost:7400/1234-5678-abcd';
  assert.strictEqual(getMediaUrl(blobUrl), blobUrl);
});

test('getMediaUrl passes data: URIs through completely unchanged', () => {
  const dataUri = 'data:image/png;base64,iVBORw0KGgo=';
  assert.strictEqual(getMediaUrl(dataUri), dataUri);
});
