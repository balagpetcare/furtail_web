import { describe, it, beforeEach } from 'node:test';
import * as assert from 'node:assert';

// This test file runs under plain Node (no DOM), but return-navigation.ts
// gates every function behind `typeof window !== "undefined"` — so a
// minimal in-memory stub of window/sessionStorage is enough to exercise
// the real logic without needing a browser/jsdom environment.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

// ES module imports are hoisted above any other top-level code regardless
// of textual order, but return-navigation.ts only reads `window`/
// `sessionStorage` lazily *inside* each exported function — never at
// module load — so it's safe to import it here and install the stubs
// below before any test actually calls into it.
import { markAppVisited, hasInternalAppHistory, saveScrollPosition, consumeScrollPosition } from './return-navigation';

interface StubGlobal {
  window: { history: { length: number } };
  sessionStorage: MemoryStorage;
}

const storage = new MemoryStorage();
const stubGlobal = globalThis as unknown as StubGlobal;
stubGlobal.window = { history: { length: 1 } };
stubGlobal.sessionStorage = storage;

describe('return-navigation', () => {
  beforeEach(() => {
    storage.clear();
    stubGlobal.window.history.length = 1;
  });

  describe('hasInternalAppHistory', () => {
    it('is false before any app page has marked itself visited', () => {
      assert.strictEqual(hasInternalAppHistory(), false);
    });

    it('is false if visited but browser history has no real back target', () => {
      markAppVisited();
      stubGlobal.window.history.length = 1;
      assert.strictEqual(hasInternalAppHistory(), false);
    });

    it('is true once an app page has visited AND there is real history to go back to', () => {
      markAppVisited();
      stubGlobal.window.history.length = 2;
      assert.strictEqual(hasInternalAppHistory(), true);
    });
  });

  describe('saveScrollPosition / consumeScrollPosition', () => {
    it('round-trips a saved position for a given route key', () => {
      saveScrollPosition('/', 4200);
      assert.strictEqual(consumeScrollPosition('/'), 4200);
    });

    it('consumes (deletes) the value — a second read returns null', () => {
      saveScrollPosition('/', 1000);
      consumeScrollPosition('/');
      assert.strictEqual(consumeScrollPosition('/'), null);
    });

    it('keeps different route keys independent', () => {
      saveScrollPosition('/', 100);
      saveScrollPosition('/explore', 200);
      assert.strictEqual(consumeScrollPosition('/explore'), 200);
      assert.strictEqual(consumeScrollPosition('/'), 100);
    });

    it('returns null for a route that was never saved', () => {
      assert.strictEqual(consumeScrollPosition('/never-scrolled'), null);
    });

    it('ignores a non-positive/invalid saved value rather than restoring to a nonsensical position', () => {
      saveScrollPosition('/', 0);
      assert.strictEqual(consumeScrollPosition('/'), null);
    });
  });
});
