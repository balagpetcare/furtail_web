import { test, describe } from "node:test";
import * as assert from "node:assert";

import { isRenderable } from "./external-ad-card";
import type { ExternalAdRenderContract } from "@/lib/api/petsmart-ads-client";

function baseAd(overrides: Partial<ExternalAdRenderContract> = {}): ExternalAdRenderContract {
  return {
    status: "FILL",
    deliveryType: "EXTERNAL",
    provider: "TEST_PROVIDER",
    placement: "HOME_FEED",
    format: "MARKUP",
    externalRequestId: "extreq_test",
    renderToken: "rendertok_test",
    markup: '<div data-external-ad="test-provider" style="padding:12px;">Sponsored (TEST_PROVIDER) — local test fixture, not a real ad</div>',
    clickThroughUrl: "https://example.test/external-ad-test-provider-click",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  };
}

describe("ExternalAdCard fail-open render contract (Command 5 §4/§H)", () => {
  test("B) renders a well-formed TEST_PROVIDER MARKUP fixture", () => {
    assert.strictEqual(isRenderable(baseAd()), true);
  });

  test("fails open on malformed/unterminated markup (RENDER_FAILURE scenario)", () => {
    assert.strictEqual(
      isRenderable(baseAd({ markup: '<div data-external-ad-broken="true">' })),
      false,
    );
  });

  test("fails open on an unexpected provider (never renders a real-provider fixture as if it were TEST_PROVIDER)", () => {
    assert.strictEqual(isRenderable(baseAd({ provider: "GOOGLE" })), false);
  });

  test("fails open on an unsupported render format", () => {
    assert.strictEqual(isRenderable(baseAd({ format: "VAST" })), false);
  });

  test("fails open on missing markup", () => {
    assert.strictEqual(isRenderable(baseAd({ markup: undefined })), false);
  });

  test("fails open on an expired candidate", () => {
    assert.strictEqual(
      isRenderable(baseAd({ expiresAt: new Date(Date.now() - 1000).toISOString() })),
      false,
    );
  });

  test("fails open when markup does not start with the known-safe prefix", () => {
    assert.strictEqual(
      isRenderable(baseAd({ markup: '<script>alert(1)</script>' })),
      false,
    );
  });
});
