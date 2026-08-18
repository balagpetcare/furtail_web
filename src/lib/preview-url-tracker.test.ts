import { describe, it, mock } from "node:test";
import * as assert from "node:assert";
import { createPreviewUrlTracker } from "./preview-url-tracker";

function fakeFile(name: string): File {
  return { name } as unknown as File;
}

describe("createPreviewUrlTracker", () => {
  it("creates a URL via the injected createObjectURL and tracks it as active", () => {
    let counter = 0;
    const createObjectURL = mock.fn(() => `blob:fake-${++counter}`);
    const revokeObjectURL = mock.fn();
    const tracker = createPreviewUrlTracker(createObjectURL, revokeObjectURL);

    const url = tracker.create(fakeFile("a.jpg"));

    assert.strictEqual(url, "blob:fake-1");
    assert.strictEqual(createObjectURL.mock.callCount(), 1);
    assert.strictEqual(tracker.isActive(url), true);
    assert.strictEqual(tracker.size(), 1);
  });

  it("does NOT revoke anything merely because create() was called again for other files (no revoke-on-mutation)", () => {
    let counter = 0;
    const createObjectURL = mock.fn(() => `blob:fake-${++counter}`);
    const revokeObjectURL = mock.fn();
    const tracker = createPreviewUrlTracker(createObjectURL, revokeObjectURL);

    const urlA = tracker.create(fakeFile("a.jpg"));
    const urlB = tracker.create(fakeFile("b.jpg"));

    // Simulates repeated state transitions (LOCAL -> UPLOADING -> READY)
    // that would, under the old buggy effect-cleanup design, have revoked
    // every previously-created preview URL on every re-render.
    for (let i = 0; i < 5; i++) {
      tracker.isActive(urlA);
      tracker.isActive(urlB);
    }

    assert.strictEqual(revokeObjectURL.mock.callCount(), 0);
    assert.strictEqual(tracker.isActive(urlA), true);
    assert.strictEqual(tracker.isActive(urlB), true);
  });

  it("revoke() revokes exactly the requested URL exactly once and leaves others untouched", () => {
    let counter = 0;
    const createObjectURL = mock.fn(() => `blob:fake-${++counter}`);
    const revokeObjectURL = mock.fn();
    const tracker = createPreviewUrlTracker(createObjectURL, revokeObjectURL);

    const urlA = tracker.create(fakeFile("a.jpg"));
    const urlB = tracker.create(fakeFile("b.jpg"));

    tracker.revoke(urlA);

    assert.strictEqual(revokeObjectURL.mock.callCount(), 1);
    assert.strictEqual(revokeObjectURL.mock.calls[0]?.arguments[0], urlA);
    assert.strictEqual(tracker.isActive(urlA), false);
    assert.strictEqual(tracker.isActive(urlB), true);
  });

  it("revoke() on an already-revoked or unknown URL is a no-op (no double-revoke)", () => {
    const createObjectURL = mock.fn(() => "blob:fake-1");
    const revokeObjectURL = mock.fn();
    const tracker = createPreviewUrlTracker(createObjectURL, revokeObjectURL);

    const url = tracker.create(fakeFile("a.jpg"));
    tracker.revoke(url);
    tracker.revoke(url); // second call — must not revoke again
    tracker.revoke("blob:never-created");

    assert.strictEqual(revokeObjectURL.mock.callCount(), 1);
  });

  it("revokeAll() revokes every currently active URL exactly once and clears tracking", () => {
    let counter = 0;
    const createObjectURL = mock.fn(() => `blob:fake-${++counter}`);
    const revokeObjectURL = mock.fn();
    const tracker = createPreviewUrlTracker(createObjectURL, revokeObjectURL);

    tracker.create(fakeFile("a.jpg"));
    tracker.create(fakeFile("b.jpg"));
    tracker.create(fakeFile("c.jpg"));

    tracker.revokeAll();

    assert.strictEqual(revokeObjectURL.mock.callCount(), 3);
    assert.strictEqual(tracker.size(), 0);
  });

  it("a URL removed then re-created (retry scenario) is tracked as active again under its own identity", () => {
    let counter = 0;
    const createObjectURL = mock.fn(() => `blob:fake-${++counter}`);
    const revokeObjectURL = mock.fn();
    const tracker = createPreviewUrlTracker(createObjectURL, revokeObjectURL);

    const url = tracker.create(fakeFile("a.jpg"));
    tracker.revoke(url);
    assert.strictEqual(tracker.isActive(url), false);

    const url2 = tracker.create(fakeFile("a-retry.jpg"));
    assert.strictEqual(tracker.isActive(url2), true);
    assert.strictEqual(tracker.size(), 1);
  });
});
