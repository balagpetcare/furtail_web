import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { isVideoMedia } from './media-grid';

describe('isVideoMedia', () => {
  it('detects video by mimetype prefix', () => {
    assert.strictEqual(isVideoMedia({ id: 1, url: '/media/1', type: 'video/mp4' }), true);
  });

  it('detects video by .mp4 file extension when type is missing', () => {
    assert.strictEqual(isVideoMedia({ id: 1, url: '/media/1.mp4' }), true);
  });

  it('treats an image mimetype as not-video', () => {
    assert.strictEqual(isVideoMedia({ id: 1, url: '/media/1.jpg', type: 'image/jpeg' }), false);
  });

  it('treats a url with no extension and no type as not-video', () => {
    assert.strictEqual(isVideoMedia({ id: 1, url: '/media/1' }), false);
  });
});
