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
        { id: 1, url: "test.jpg", type: "IMAGE", status: "READY", order: 0 },
      ]),
      "IMAGE"
    );
  });

  it("returns VIDEO when any video is present", () => {
    assert.strictEqual(
      inferPostType([
        { id: 1, url: "test.jpg", type: "IMAGE", status: "READY", order: 0 },
        { id: 2, url: "test.mp4", type: "VIDEO", status: "READY", order: 1 },
      ]),
      "VIDEO"
    );
  });

  it("returns VIDEO for video-only media", () => {
    assert.strictEqual(
      inferPostType([
        { id: 1, url: "test.mp4", type: "VIDEO", status: "READY", order: 0 },
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
        { id: 2, url: "b.jpg", type: "IMAGE" as const, status: "READY" as const, order: 1 },
        { id: 1, url: "a.jpg", type: "IMAGE" as const, status: "READY" as const, order: 0 },
        { id: 3, url: "c.jpg", type: "IMAGE" as const, status: "UPLOADING" as const, order: 2 },
      ],
    };

    const input = draftToCreatePostInput(draft);

    assert.deepStrictEqual(input.mediaIds, [1, 2]);
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
