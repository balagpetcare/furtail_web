import test from "node:test";
import assert from "node:assert";

/**
 * Create Post idempotency lifecycle. The composer (create-post-modal.tsx)
 * owns key generation/reuse across retries — that stateful behavior isn't
 * covered here since this project's test runner has no React component
 * harness (see docs/jobs job file). What's covered here is the contract
 * boundary these tests can actually reach: postsApi.createPost must pass an
 * explicitly supplied key straight through as the Idempotency-Key header,
 * and must not interfere with fetchApi's existing generic per-POST default
 * when no key is supplied (the pre-existing behavior other endpoints rely
 * on, which this work was explicitly told not to remove).
 */

interface CapturedRequest {
  url: string;
  headers: Headers;
}

function withMockedFetch(
  responseBody: unknown,
  run: (captured: CapturedRequest[]) => Promise<void>,
) {
  const captured: CapturedRequest[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    captured.push({ url: String(input), headers: new Headers(init?.headers) });
    return new Response(JSON.stringify({ data: responseBody }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return run(captured).finally(() => {
    globalThis.fetch = originalFetch;
  });
}

test("createPost passes an explicitly supplied idempotencyKey through as the Idempotency-Key header", async () => {
  const { postsApi } = await import("./posts");
  await withMockedFetch({ id: 1, author: {} }, async (captured) => {
    await postsApi.createPost({ caption: "hello", idempotencyKey: "fixed-key-123" });
    assert.strictEqual(captured.length, 1);
    assert.strictEqual(captured[0]!.headers.get("Idempotency-Key"), "fixed-key-123");
  });
});

test("createPost called twice with the same explicit key sends the same header both times (retry contract)", async () => {
  const { postsApi } = await import("./posts");
  await withMockedFetch({ id: 1, author: {} }, async (captured) => {
    await postsApi.createPost({ caption: "hello", idempotencyKey: "stable-key" });
    await postsApi.createPost({ caption: "hello", idempotencyKey: "stable-key" });
    assert.strictEqual(captured.length, 2);
    assert.strictEqual(captured[0]!.headers.get("Idempotency-Key"), "stable-key");
    assert.strictEqual(captured[1]!.headers.get("Idempotency-Key"), "stable-key");
  });
});

test("createPost without an explicit key falls back to fetchApi's existing generic per-call UUID (unchanged pre-existing behavior)", async () => {
  const { postsApi } = await import("./posts");
  await withMockedFetch({ id: 1, author: {} }, async (captured) => {
    await postsApi.createPost({ caption: "hello" });
    const key = captured[0]!.headers.get("Idempotency-Key");
    assert.ok(key, "expected fetchApi's generic fallback to still set a key");
    // A UUIDv4 fallback, not empty/undefined — proves the generic path is untouched.
    assert.match(key!, /^[0-9a-f-]{36}$/i);
  });
});

test("a different call (new logical post) with no shared key produces two different Idempotency-Key headers", async () => {
  const { postsApi } = await import("./posts");
  await withMockedFetch({ id: 1, author: {} }, async (captured) => {
    await postsApi.createPost({ caption: "post one" });
    await postsApi.createPost({ caption: "post two" });
    assert.notStrictEqual(
      captured[0]!.headers.get("Idempotency-Key"),
      captured[1]!.headers.get("Idempotency-Key"),
    );
  });
});
