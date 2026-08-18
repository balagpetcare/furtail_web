import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  dedupeById,
  getPageItems,
  setPageItems,
  updateFirstPage,
  updateAllPages,
  extractComment,
  type RawComment,
  type CommentsCache,
} from './comments-cache';

function comment(id: number | string, text = 'x'): RawComment {
  return { id, text };
}

describe('dedupeById', () => {
  it('keeps the first occurrence when the same id appears twice', () => {
    const result = dedupeById([comment(1, 'first'), comment(1, 'second'), comment(2)]);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].text, 'first');
  });

  it('treats numeric and string ids that stringify the same as duplicates', () => {
    const result = dedupeById([comment(1), comment('1')]);
    assert.strictEqual(result.length, 1);
  });

  it('leaves a list with no duplicates unchanged in order', () => {
    const result = dedupeById([comment(3), comment(1), comment(2)]);
    assert.deepStrictEqual(result.map((c) => c.id), [3, 1, 2]);
  });
});

describe('getPageItems / setPageItems', () => {
  it('round-trips a bare-array page', () => {
    const page = [comment(1), comment(2)];
    assert.deepStrictEqual(getPageItems(page), page);
    assert.deepStrictEqual(setPageItems(page, [comment(3)]), [comment(3)]);
  });

  it('round-trips a {data} page shape', () => {
    const page = { data: [comment(1)], nextCursor: 'abc' };
    assert.deepStrictEqual(getPageItems(page), [comment(1)]);
    assert.deepStrictEqual(setPageItems(page, [comment(2)]), { data: [comment(2)], nextCursor: 'abc' });
  });

  it('round-trips an {items} page shape', () => {
    const page = { items: [comment(1)], hasMore: true };
    assert.deepStrictEqual(getPageItems(page), [comment(1)]);
    assert.deepStrictEqual(setPageItems(page, [comment(2)]), { items: [comment(2)], hasMore: true });
  });
});

function makeCache(pages: RawComment[][]): CommentsCache {
  return {
    pages: pages.map((items) => ({ data: items })),
    pageParams: pages.map(() => undefined),
  };
}

describe('updateFirstPage (optimistic comment insert)', () => {
  it('prepends a new comment to only the first page', () => {
    const cache = makeCache([[comment(2)], [comment(1)]]);
    const result = updateFirstPage(cache, (items) => [comment('temp-1', 'new'), ...items]);
    assert.deepStrictEqual(getPageItems(result!.pages[0]).map((c) => c.id), ['temp-1', 2]);
    assert.deepStrictEqual(getPageItems(result!.pages[1]).map((c) => c.id), [1]);
  });

  it('never produces a duplicate id even if the updater introduces one', () => {
    const cache = makeCache([[comment(1)]]);
    const result = updateFirstPage(cache, (items) => [comment(1, 'dupe'), ...items]);
    assert.strictEqual(getPageItems(result!.pages[0]).length, 1);
  });

  it('is a no-op on an empty/undefined cache instead of throwing', () => {
    assert.strictEqual(updateFirstPage(undefined, (items) => items), undefined);
    assert.deepStrictEqual(updateFirstPage(makeCache([]), (items) => items), makeCache([]));
  });
});

describe('updateAllPages (like/delete/reconcile)', () => {
  it('replacing a temp id with the real server comment never leaves both present', () => {
    const cache = makeCache([[comment('temp-1', 'optimistic'), comment(2)]]);
    const real = comment(99, 'optimistic');
    const result = updateAllPages(cache, (items) => items.map((c) => (c.id === 'temp-1' ? real : c)));
    const ids = getPageItems(result!.pages[0]).map((c) => c.id);
    assert.deepStrictEqual(ids, [99, 2]);
  });

  it('applies a patch across every page, not just the first', () => {
    const cache = makeCache([[comment(1)], [comment(2, 'old')]]);
    const result = updateAllPages(cache, (items) => items.map((c) => (c.id === 2 ? { ...c, text: 'liked' } : c)));
    assert.strictEqual(getPageItems(result!.pages[1])[0].text, 'liked');
  });
});

describe('extractComment', () => {
  it('unwraps a {item} envelope', () => {
    const raw = { item: comment(5, 'hello') };
    assert.deepStrictEqual(extractComment(raw), comment(5, 'hello'));
  });

  it('passes through a bare comment object', () => {
    const raw = comment(6, 'hi');
    assert.deepStrictEqual(extractComment(raw), raw);
  });
});
