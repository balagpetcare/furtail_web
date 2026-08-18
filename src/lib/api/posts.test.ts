import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { normalizeAuthor, normalizePost } from './posts';

describe('normalizeAuthor', () => {
  it('handles normal author with displayName', () => {
    const raw = {
      id: 123,
      profile: {
        displayName: 'John Doe',
        username: 'johndoe',
        avatarMedia: { url: 'https://example.com/avatar.jpg' }
      }
    };
    const author = normalizeAuthor(raw);
    assert.strictEqual(author.displayName, 'John Doe');
    assert.strictEqual(author.username, 'johndoe');
    assert.strictEqual(author.avatarUrl, 'https://example.com/avatar.jpg');
    assert.strictEqual(author.id, 123);
  });

  it('handles missing displayName by falling back to Furtail User', () => {
    const raw = {
      id: 456,
      profile: {
        username: 'ghost'
      }
    };
    const author = normalizeAuthor(raw);
    assert.strictEqual(author.displayName, 'ghost');
    assert.strictEqual(author.username, 'ghost');
  });

  it('handles empty string displayName', () => {
    const raw = {
      id: 789,
      profile: {
        displayName: '   ',
      }
    };
    const author = normalizeAuthor(raw);
    assert.strictEqual(author.displayName, 'Furtail User');
  });

  it('handles missing avatar', () => {
    const raw = {
      id: 111,
      profile: {
        displayName: 'No Avatar',
      }
    };
    const author = normalizeAuthor(raw);
    assert.strictEqual(author.avatarUrl, undefined);
  });

  it('handles completely null/undefined author', () => {
    const author = normalizeAuthor(null);
    assert.strictEqual(author.displayName, 'Furtail User');
    assert.strictEqual(author.id, 0);
  });

  it('handles legacy/malformed author payload with flat fields', () => {
    const raw = {
      id: 222,
      displayName: 'Legacy User',
      avatarUrl: 'https://legacy.com/pic.png'
    };
    const author = normalizeAuthor(raw);
    assert.strictEqual(author.displayName, 'Legacy User');
    assert.strictEqual(author.avatarUrl, 'https://legacy.com/pic.png');
  });

  it('maps canonical id to both id (number) and userId (string)', () => {
    const raw = { id: 777, displayName: 'Test User' };
    const author = normalizeAuthor(raw);
    assert.strictEqual(author.id, 777);
    assert.strictEqual(author.userId, '777');
  });

  it('handles duplicate user record deduplication using a Set', () => {
    const rawItems = [
      { id: 101, displayName: 'User A' },
      { userId: 101, displayName: 'User A Dupe' },
      { id: 102, displayName: 'User B' }
    ];
    const seen = new Set<string>();
    const unique: Array<ReturnType<typeof normalizeAuthor>> = [];
    for (const item of rawItems) {
      const normalized = normalizeAuthor(item);
      if (normalized.userId && !seen.has(normalized.userId)) {
        seen.add(normalized.userId);
        unique.push(normalized);
      }
    }
    assert.strictEqual(unique.length, 2);
    assert.strictEqual(unique[0].id, 101);
    assert.strictEqual(unique[0].displayName, 'User A');
    assert.strictEqual(unique[1].id, 102);
    assert.strictEqual(unique[1].displayName, 'User B');
  });
});

describe('normalizePost', () => {
  it('normalizes posts with nested media objects from social API', () => {
    const rawPost = {
      id: 1,
      type: 'post',
      caption: 'Hello, world!',
      createdAt: '2026-08-17T00:00:00Z',
      author: { id: 10, displayName: 'John' },
      media: [
        {
          id: 87,
          media: {
            id: 87,
            url: '/api/v1/media/57/123.png',
            mimetype: 'image/png'
          }
        }
      ]
    };
    const post = normalizePost(rawPost);
    assert.strictEqual(post.media.length, 1);
    assert.strictEqual(post.media[0].id, 87);
    assert.strictEqual(post.media[0].url, '/api/v1/media/57/123.png');
    assert.strictEqual(post.media[0].type, 'image/png');
  });

  it('normalizes posts with flat media objects', () => {
    const rawPost = {
      id: 2,
      type: 'post',
      caption: 'Simple',
      createdAt: '2026-08-17T00:00:00Z',
      author: { id: 11, displayName: 'Doe' },
      media: [
        {
          id: 90,
          url: '/api/v1/media/57/456.jpg',
          type: 'image/jpeg'
        }
      ]
    };
    const post = normalizePost(rawPost);
    assert.strictEqual(post.media.length, 1);
    assert.strictEqual(post.media[0].id, 90);
    assert.strictEqual(post.media[0].url, '/api/v1/media/57/456.jpg');
    assert.strictEqual(post.media[0].type, 'image/jpeg');
  });
});
