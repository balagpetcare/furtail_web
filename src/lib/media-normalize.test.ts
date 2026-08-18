import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { normalizeMediaItem, normalizeMediaList } from './media-normalize';

describe('normalizeMediaItem', () => {
  it('normalizes the real posts shape: nested media object, lowercase mimetype', () => {
    // Matches serializePost's actual wire shape, confirmed against a live
    // /posts/feed response during the media-delivery forensic audit.
    const raw = { id: 109, media: { id: 109, url: '/api/v1/media/60/abc/photo.png', mimetype: 'image/png' } };
    const item = normalizeMediaItem(raw);
    assert.deepStrictEqual(item, { id: 109, url: '/api/v1/media/60/abc/photo.png', type: 'image/png' });
  });

  it('normalizes the real adoption shape: nested media object, camelCase mimeType', () => {
    // Matches serializeListing's actual wire shape — deliberately different
    // casing from posts; this is the real backend inconsistency the
    // canonical normalizer exists to absorb.
    const raw = { id: 14, media: { id: 14, url: '/api/v1/media/8/def/pet.png', mimeType: 'image/png' } };
    const item = normalizeMediaItem(raw);
    assert.deepStrictEqual(item, { id: 14, url: '/api/v1/media/8/def/pet.png', type: 'image/png' });
  });

  it('normalizes the real fundraising shape: flat object, lowercase mimetype', () => {
    // Matches campaignPayload's actual wire shape (post-fix) — flat, not
    // nested under `.media`.
    const raw = { id: 1, url: '/api/v1/media/1/1/avatar.jpg', mimetype: 'image/jpeg' };
    const item = normalizeMediaItem(raw);
    assert.deepStrictEqual(item, { id: 1, url: '/api/v1/media/1/1/avatar.jpg', type: 'image/jpeg' });
  });

  it('preserves an absolute URL untouched (URL resolution is getMediaUrl\'s job, not this)', () => {
    const raw = { id: 2, url: 'https://cdn.furtail.app/media/2/video.mp4', mimetype: 'video/mp4' };
    const item = normalizeMediaItem(raw);
    assert.strictEqual(item?.url, 'https://cdn.furtail.app/media/2/video.mp4');
  });

  it('falls back to a bare `type` field when no mimetype/mimeType is present', () => {
    const raw = { id: 3, url: '/api/v1/media/3/x.mp4', type: 'VIDEO' };
    const item = normalizeMediaItem(raw);
    assert.strictEqual(item?.type, 'VIDEO');
  });

  it('returns null (never a fabricated "/undefined" url) when no url exists anywhere', () => {
    assert.strictEqual(normalizeMediaItem({ id: 4 }), null);
    assert.strictEqual(normalizeMediaItem({ id: 5, media: {} }), null);
  });

  it('returns null for null/undefined/non-object input', () => {
    assert.strictEqual(normalizeMediaItem(null), null);
    assert.strictEqual(normalizeMediaItem(undefined), null);
    assert.strictEqual(normalizeMediaItem('not an object'), null);
  });

  it('treats an empty-string url the same as a missing url', () => {
    assert.strictEqual(normalizeMediaItem({ id: 6, url: '' }), null);
  });
});

describe('normalizeMediaList', () => {
  it('handles null/undefined/non-array input as an empty list', () => {
    assert.deepStrictEqual(normalizeMediaList(null), []);
    assert.deepStrictEqual(normalizeMediaList(undefined), []);
    assert.deepStrictEqual(normalizeMediaList('not an array'), []);
  });

  it('drops items with no resolvable url instead of producing broken entries', () => {
    const raw = [
      { id: 1, url: '/api/v1/media/1/a.jpg', mimetype: 'image/jpeg' },
      { id: 2 }, // no url anywhere — must be dropped, not passed through as url: ""
      { id: 3, url: '/api/v1/media/3/b.mp4', mimetype: 'video/mp4' },
    ];
    const result = normalizeMediaList(raw);
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result.map((r) => r.id), [1, 3]);
  });

  it('normalizes a mixed batch across all three real backend shapes at once', () => {
    const raw = [
      { id: 1, media: { url: '/m/1.jpg', mimetype: 'image/jpeg' } }, // post-shaped
      { id: 2, media: { url: '/m/2.jpg', mimeType: 'image/jpeg' } }, // adoption-shaped
      { id: 3, url: '/m/3.jpg', mimetype: 'image/jpeg' }, // fundraising-shaped
    ];
    const result = normalizeMediaList(raw);
    assert.strictEqual(result.length, 3);
    assert.ok(result.every((r) => r.type === 'image/jpeg'));
  });
});
