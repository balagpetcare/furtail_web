import { describe, it } from "node:test";
import * as assert from "node:assert";
import {
  DEFAULT_DRAFT,
  draftToCreatePostInput,
  inferPostType,
} from "./create-post-draft";

describe("inferPostType", () => {
  it("returns TEXT when no media", () => {
    assert.strictEqual(inferPostType([]), "TEXT");
  });

  it("returns IMAGE when only images", () => {
    assert.strictEqual(
      inferPostType([
        { clientId: 1, previewUrl: "blob:test1", serverMediaId: 101, serverUrl: "/api/v1/media/test.jpg", type: "IMAGE", status: "READY", order: 0 },
      ]),
      "IMAGE"
    );
  });

  it("returns VIDEO when any video is present", () => {
    assert.strictEqual(
      inferPostType([
        { clientId: 1, previewUrl: "blob:test1", serverMediaId: 101, serverUrl: "/api/v1/media/test.jpg", type: "IMAGE", status: "READY", order: 0 },
        { clientId: 2, previewUrl: "blob:test2", serverMediaId: 102, serverUrl: "/api/v1/media/test.mp4", type: "VIDEO", status: "READY", order: 1 },
      ]),
      "VIDEO"
    );
  });

  it("returns VIDEO for video-only media", () => {
    assert.strictEqual(
      inferPostType([
        { clientId: 1, previewUrl: "blob:test1", serverMediaId: 101, serverUrl: "/api/v1/media/test.mp4", type: "VIDEO", status: "READY", order: 0 },
      ]),
      "VIDEO"
    );
  });
});

describe("draftToCreatePostInput", () => {
  it("converts a text-only draft correctly", () => {
    const draft = {
      ...DEFAULT_DRAFT,
      caption: "Hello world",
    };

    const input = draftToCreatePostInput(draft);

    assert.strictEqual(input.caption, "Hello world");
    assert.strictEqual(input.type, "TEXT");
    assert.strictEqual(input.privacy, "PUBLIC");
    assert.strictEqual(input.postType, "GENERAL");
  });

  it("includes only READY media and sorts by order", () => {
    const draft = {
      ...DEFAULT_DRAFT,
      caption: "Test",
      media: [
        { clientId: 2, previewUrl: "blob:b", serverMediaId: 1002, serverUrl: "/api/v1/media/b.jpg", type: "IMAGE" as const, status: "READY" as const, order: 1 },
        { clientId: 1, previewUrl: "blob:a", serverMediaId: 1001, serverUrl: "/api/v1/media/a.jpg", type: "IMAGE" as const, status: "READY" as const, order: 0 },
        { clientId: 3, previewUrl: "blob:c", type: "IMAGE" as const, status: "UPLOADING" as const, order: 2 },
      ],
    };

    const input = draftToCreatePostInput(draft);

    // mediaIds must be built from serverMediaId (the durable server id), not
    // clientId (the ephemeral local identity) — and must exclude anything
    // not yet READY even if it happens to carry a serverMediaId.
    assert.deepStrictEqual(input.mediaIds, [1001, 1002]);
  });

  it("never includes a clientId as a mediaId, even if it collides numerically with a real serverMediaId", () => {
    const draft = {
      ...DEFAULT_DRAFT,
      caption: "Test",
      media: [
        // clientId 1 deliberately collides with another item's serverMediaId
        // to prove mediaIds is built from serverMediaId, not clientId.
        { clientId: 1, previewUrl: "blob:a", serverMediaId: 9001, serverUrl: "/api/v1/media/a.jpg", type: "IMAGE" as const, status: "READY" as const, order: 0 },
      ],
    };

    const input = draftToCreatePostInput(draft);

    assert.deepStrictEqual(input.mediaIds, [9001]);
    assert.ok(!input.mediaIds?.includes(1));
  });

  it("excludes READY-looking items that never actually received a serverMediaId (upload contract violation)", () => {
    const draft = {
      ...DEFAULT_DRAFT,
      caption: "Test",
      media: [
        // Defensive case: status says READY but serverMediaId is missing —
        // must never leak into the submitted payload.
        { clientId: 1, previewUrl: "blob:a", type: "IMAGE" as const, status: "READY" as const, order: 0 },
      ],
    };

    const input = draftToCreatePostInput(draft);

    assert.strictEqual(input.mediaIds, undefined);
  });

  it("preserves content tag IDs", () => {
    const draft = {
      ...DEFAULT_DRAFT,
      caption: "Tagged post",
      contentTagIds: [5, 7],
    };

    const input = draftToCreatePostInput(draft);

    assert.deepStrictEqual(input.contentTagIds, [5, 7]);
  });

  it("omits contentTagIds when none are selected", () => {
    const draft = { ...DEFAULT_DRAFT, caption: "No tags" };

    const input = draftToCreatePostInput(draft);

    assert.strictEqual(input.contentTagIds, undefined);
  });

  it("preserves tagged pet IDs", () => {
    const draft = {
      ...DEFAULT_DRAFT,
      caption: "With my pets",
      taggedPetIds: [10, 20],
    };

    const input = draftToCreatePostInput(draft);

    assert.deepStrictEqual(input.taggedPetIds, [10, 20]);
  });

  it("includes feeling/activity metadata", () => {
    const draft = {
      ...DEFAULT_DRAFT,
      caption: "Test",
      feelingId: "happy",
      feelingLabel: "Happy",
      feelingEmoji: "😊",
      activityId: "playing",
      activityLabel: "Playing",
      activityEmoji: "🎮",
    };

    const input = draftToCreatePostInput(draft);

    assert.strictEqual(input.feelingId, "happy");
    assert.strictEqual(input.feelingLabel, "Happy");
    assert.strictEqual(input.feelingEmoji, "😊");
    assert.strictEqual(input.activityId, "playing");
    assert.strictEqual(input.activityLabel, "Playing");
    assert.strictEqual(input.activityEmoji, "🎮");
  });

  it("includes lost pet information when provided", () => {
    const draft = {
      ...DEFAULT_DRAFT,
      caption: "Lost pet alert",
      postType: "LOST_PET",
      lostPetName: "Fluffy",
      lostPetLocation: "Central Park",
      lostPetContactVisible: true,
    };

    const input = draftToCreatePostInput(draft);

    assert.strictEqual(input.lostPetName, "Fluffy");
    assert.strictEqual(input.lostPetLocation, "Central Park");
    assert.strictEqual(input.lostPetContactVisible, true);
  });

  it("handles privacy correctly", () => {
    const draft = {
      ...DEFAULT_DRAFT,
      caption: "Private post",
      privacy: "PRIVATE" as const,
    };

    const input = draftToCreatePostInput(draft);

    assert.strictEqual(input.privacy, "PRIVATE");
  });

  it("handles background style for text posts", () => {
    const draft = {
      ...DEFAULT_DRAFT,
      caption: "Colorful text",
      backgroundStyle: "GRADIENT_1",
    };

    const input = draftToCreatePostInput(draft);

    assert.strictEqual(input.backgroundStyle, "GRADIENT_1");
  });

  it("includes location text", () => {
    const draft = {
      ...DEFAULT_DRAFT,
      caption: "At the park",
      locationText: "Central Park, New York",
    };

    const input = draftToCreatePostInput(draft);

    assert.strictEqual(input.locationText, "Central Park, New York");
  });

  it("SELECTOR UX UNIFICATION §20: a draft with Post Type + Feeling + Activity + Pet + Location + Category + Tags all set simultaneously builds a payload where every field survives — no selection erases an unrelated one", () => {
    const draft = {
      ...DEFAULT_DRAFT,
      caption: "Full metadata post",
      postType: "HEALTH_UPDATE",
      feelingId: "happy",
      feelingLabel: "Happy",
      feelingEmoji: "😊",
      activityId: "playing",
      activityLabel: "Playing",
      activityEmoji: "🎮",
      taggedPetIds: [42],
      locationText: "Dhaka",
      category: "GENERAL",
      contentTagIds: [7, 9],
    };

    const input = draftToCreatePostInput(draft);

    assert.strictEqual(input.postType, "HEALTH_UPDATE");
    assert.strictEqual(input.feelingId, "happy");
    assert.strictEqual(input.feelingLabel, "Happy");
    assert.strictEqual(input.feelingEmoji, "😊");
    assert.strictEqual(input.activityId, "playing");
    assert.strictEqual(input.activityLabel, "Playing");
    assert.strictEqual(input.activityEmoji, "🎮");
    assert.deepStrictEqual(input.taggedPetIds, [42]);
    assert.strictEqual(input.locationText, "Dhaka");
    assert.strictEqual(input.category, "GENERAL");
    assert.deepStrictEqual(input.contentTagIds, [7, 9]);
  });

  it("includes music metadata when provided", () => {
    const draft = {
      ...DEFAULT_DRAFT,
      caption: "Enjoying music",
      songTitle: "Song Title",
      songArtist: "Artist Name",
      songStartMs: 1000,
      songDurationMs: 240000,
    };

    const input = draftToCreatePostInput(draft);

    assert.strictEqual(input.songTitle, "Song Title");
    assert.strictEqual(input.songArtist, "Artist Name");
    assert.strictEqual(input.songStartMs, 1000);
    assert.strictEqual(input.songDurationMs, 240000);
  });
});
