import { describe, it, mock } from "node:test";
import * as assert from "node:assert";
import { createWatchSession, trackNotInterested, type WatchEventType } from "./watch-analytics";

interface SentEvent {
  postId: number | string;
  sessionId: string;
  events: Array<{ eventType: WatchEventType; positionMs?: number; value?: string }>;
}

function makeHarness() {
  const sent: SentEvent[] = [];
  const transport = mock.fn(async (postId: number | string, sessionId: string, events: Array<{ eventType: WatchEventType }>) => {
    sent.push({ postId, sessionId, events });
  });
  return { sent, transport };
}

describe("watch-analytics", () => {
  it("never emits anything for an empty/invalid postId", () => {
    const { transport } = makeHarness();
    const session = createWatchSession("", transport);
    session.markVisible();
    session.onPlay();
    session.onProgress(15000, 60000);
    session.onEnded();
    session.dispose();
    assert.strictEqual(transport.mock.callCount(), 0);
  });

  it("flushes each event type at most once per watch", () => {
    const { sent, transport } = makeHarness();
    const session = createWatchSession(42, transport);
    session.markVisible();
    session.markVisible();
    session.onPlay();
    session.onPlay();
    session.onProgress(4000, 60000);
    session.onProgress(9000, 60000);
    session.onProgress(60000, 60000);
    session.onEnded();
    session.dispose();

    const types = sent.flatMap((s) => s.events.map((e) => e.eventType));
    assert.deepStrictEqual(
      [...new Set(types)].sort(),
      ["complete", "impression", "progress_10s", "progress_25", "progress_3s", "progress_50", "progress_75", "start"],
    );
    assert.ok(!types.some((t) => t === "replay"), "no replay in a first watch");
    // Each event type appears at most once across all flushes.
    const counts = types.reduce<Record<string, number>>((acc, t) => ((acc[t] = (acc[t] ?? 0) + 1), acc), {});
    for (const [type, count] of Object.entries(counts)) {
      assert.strictEqual(count, 1, `${type} emitted ${count} times`);
    }
    // Everything belongs to a single session.
    assert.strictEqual(new Set(sent.map((s) => s.sessionId)).size, 1);
  });

  it("rotates to a brand-new session on replay so milestones are not dropped", () => {
    const { sent, transport } = makeHarness();
    const session = createWatchSession(7, transport);

    session.markVisible();
    session.onPlay();
    session.onProgress(60000, 60000); // 100% -> complete path
    session.onEnded();

    session.onReplay();
    session.onPlay();
    session.onProgress(20000, 60000);
    session.onProgress(60000, 60000);
    session.onEnded();
    session.dispose();

    const sessionIds = sent.map((s) => s.sessionId);
    assert.strictEqual(new Set(sessionIds).size, 2, "replay must mint a fresh session id");
    const first = sent.filter((s) => s.sessionId === sessionIds[0]).flatMap((s) => s.events.map((e) => e.eventType));
    const second = sent.filter((s) => s.sessionId === sessionIds[1]).flatMap((s) => s.events.map((e) => e.eventType));
    assert.ok(first.includes("complete") && first.includes("start"));
    assert.ok(second.includes("replay"), "fresh stream opens with the replay event");
    assert.ok(second.includes("start"), "replayed watch emits its own start");
    assert.ok(second.includes("progress_50"), "replayed watch can re-emit milestones");
  });

  it("debounces a busy session into a single batched flush", async () => {
    const { sent, transport } = makeHarness();
    const session = createWatchSession(9, transport);
    session.markVisible();
    session.onPlay();
    for (let t = 1; t <= 300; t += 1) {
      session.onProgress(t * 1000, 300000);
    }
    session.dispose();
    // dispose() flushes synchronously, so the whole stream is one call.
    assert.strictEqual(transport.mock.callCount(), 1);
    const all = sent.flatMap((s) => s.events.map((e) => e.eventType));
    assert.ok(all.includes("progress_3s") && all.includes("progress_50") && all.includes("progress_75"));
    assert.ok(!all.includes("complete"), "no ended -> no complete");
  });

  it("records quality change and not-interested with values", () => {
    const { sent, transport } = makeHarness();
    const session = createWatchSession(11, transport);
    session.markVisible();
    session.qualityChange("1080p");
    session.notInterested("adult-dog-food");
    session.dispose();

    const all = sent.flatMap((s) => s.events);
    const qc = all.find((e) => e.eventType === "quality_change");
    const ni = all.find((e) => e.eventType === "not_interested");
    assert.ok(qc, "quality_change sent");
    assert.strictEqual(qc?.value, "1080p");
    assert.ok(ni, "not_interested sent");
    assert.strictEqual(ni?.value, "adult-dog-food");
  });

  it("quality values are capped at 120 chars", () => {
    const { sent, transport } = makeHarness();
    const session = createWatchSession(13, transport);
    session.qualityChange("x".repeat(500));
    session.dispose();
    const all = sent.flatMap((s) => s.events);
    assert.ok((all[0]?.value?.length ?? 0) <= 120);
  });

  it("trackNotInterested mints its own one-off session", () => {
    const { sent, transport } = makeHarness();
    trackNotInterested(21, "not-my-style", transport);
    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].events[0].eventType, "not_interested");
    assert.strictEqual(sent[0].events[0].value, "not-my-style");
  });

  it("swallows transport failures so the caller never sees an error", async () => {
    const { transport } = makeHarness();
    transport.mock.mockImplementation(async () => {
      throw new Error("network down");
    });
    const session = createWatchSession(31, transport);
    session.markVisible();
    session.onPlay();
    session.dispose();
    assert.strictEqual(transport.mock.callCount(), 1);
    await new Promise((r) => setTimeout(r, 0));
  });
});