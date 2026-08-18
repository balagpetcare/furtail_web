import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { groupStoriesByAuthor, type Story } from './stories';

function makeStory(overrides: Partial<Story>): Story {
  return {
    id: 1,
    userId: '1',
    userName: 'User',
    mediaUrl: '/media/1.jpg',
    mediaType: 'image',
    createdAt: '2026-08-18T00:00:00Z',
    expiresAt: '2026-08-19T00:00:00Z',
    viewCount: 0,
    isViewedByMe: false,
    isOwnStory: false,
    ...overrides,
  };
}

describe('groupStoriesByAuthor', () => {
  it('groups multiple stories from the same author into one tray', () => {
    const trays = groupStoriesByAuthor([
      makeStory({ id: 1, userId: '10', userName: 'Alice' }),
      makeStory({ id: 2, userId: '10', userName: 'Alice' }),
      makeStory({ id: 3, userId: '20', userName: 'Bob' }),
    ]);
    assert.strictEqual(trays.length, 2);
    assert.strictEqual(trays[0].userId, '10');
    assert.strictEqual(trays[0].stories.length, 2);
    assert.strictEqual(trays[1].userId, '20');
    assert.strictEqual(trays[1].stories.length, 1);
  });

  it('preserves first-seen order of authors from the feed', () => {
    const trays = groupStoriesByAuthor([
      makeStory({ id: 1, userId: '20', userName: 'Bob' }),
      makeStory({ id: 2, userId: '10', userName: 'Alice' }),
    ]);
    assert.deepStrictEqual(trays.map((t) => t.userId), ['20', '10']);
  });

  it('marks a tray allViewed only when every story in it is viewed', () => {
    const trays = groupStoriesByAuthor([
      makeStory({ id: 1, userId: '10', isViewedByMe: true }),
      makeStory({ id: 2, userId: '10', isViewedByMe: false }),
    ]);
    assert.strictEqual(trays[0].allViewed, false);
  });

  it('marks a tray allViewed when all its stories are viewed', () => {
    const trays = groupStoriesByAuthor([
      makeStory({ id: 1, userId: '10', isViewedByMe: true }),
      makeStory({ id: 2, userId: '10', isViewedByMe: true }),
    ]);
    assert.strictEqual(trays[0].allViewed, true);
  });

  it('returns an empty array for an empty feed', () => {
    assert.deepStrictEqual(groupStoriesByAuthor([]), []);
  });
});
