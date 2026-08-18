import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { buildMixedFeed } from './build-feed';
import type { Post } from '@/lib/api/posts';

function makePost(id: number): Post {
  return {
    id,
    type: 'TEXT',
    caption: `post ${id}`,
    createdAt: new Date().toISOString(),
    author: { id: 1, userId: '1', displayName: 'Author' },
    media: [],
    likeCount: 0,
    commentCount: 0,
    isLikedByMe: false,
  };
}

describe('buildMixedFeed', () => {
  it('returns only posts when there is nothing else to insert', () => {
    const items = buildMixedFeed([makePost(1), makePost(2)], [], []);
    assert.strictEqual(items.length, 2);
    assert.ok(items.every((i) => i.kind === 'post'));
  });

  it('inserts an adoption card at the configured cadence', () => {
    const posts = Array.from({ length: 6 }, (_, i) => makePost(i + 1));
    const items = buildMixedFeed(posts, [{ id: 100 }], [], { adoptionEvery: 6, fundraisingEvery: 999 });
    assert.strictEqual(items.length, 7);
    assert.strictEqual(items[6].kind, 'adoption');
  });

  it('inserts a fundraising card at the configured cadence', () => {
    const posts = Array.from({ length: 5 }, (_, i) => makePost(i + 1));
    const items = buildMixedFeed(posts, [], [{ id: 200, title: "t" }], { adoptionEvery: 999, fundraisingEvery: 5 });
    assert.strictEqual(items.length, 6);
    assert.strictEqual(items[5].kind, 'fundraising');
  });

  it('produces unique, stable composite keys across all 3 id spaces', () => {
    const posts = [makePost(1)];
    const items = buildMixedFeed(posts, [{ id: 1 }], [{ id: 1, title: "t" }], { adoptionEvery: 1, fundraisingEvery: 1 });
    const keys = items.map((i) => i.key);
    assert.strictEqual(new Set(keys).size, keys.length);
  });

  it('appends leftover adoption/fundraising items even when posts run out', () => {
    const items = buildMixedFeed([], [{ id: 1 }, { id: 2 }], [{ id: 3, title: "t" }]);
    assert.strictEqual(items.length, 3);
  });
});
