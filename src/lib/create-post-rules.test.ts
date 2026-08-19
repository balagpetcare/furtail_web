import { describe, it } from "node:test";
import * as assert from "node:assert";
import {
  getPostTypeLabel,
  isValidPostCategoryKey,
  applyFeelingSelection,
  applyActivitySelection,
  clearFeeling,
  clearActivity,
  isOverCaptionLimit,
  isBackgroundEligible,
  shouldClearBackgroundForCaptionLength,
  shouldClearBackgroundForMedia,
  togglePetSelection,
  toggleContentTagSelection,
  type FeelingActivityFields,
} from "./create-post-rules";

describe("getPostTypeLabel", () => {
  it("maps every canonical backend value to its display label", () => {
    assert.strictEqual(getPostTypeLabel("GENERAL"), "General");
    assert.strictEqual(getPostTypeLabel("HEALTH_UPDATE"), "Health Update");
    assert.strictEqual(getPostTypeLabel("VACCINATION"), "Vaccination");
    assert.strictEqual(getPostTypeLabel("LOST_PET"), "Lost Pet");
    assert.strictEqual(getPostTypeLabel("ADOPTION"), "Adoption");
    assert.strictEqual(getPostTypeLabel("SERVICE_REVIEW"), "Service Review");
  });

  it("falls back to General for an unrecognized value", () => {
    assert.strictEqual(getPostTypeLabel("SOMETHING_ELSE"), "General");
    assert.strictEqual(getPostTypeLabel(""), "General");
  });
});

describe("isValidPostCategoryKey", () => {
  it("accepts the two keys that round-trip onto Post.category", () => {
    assert.strictEqual(isValidPostCategoryKey("general"), true);
    assert.strictEqual(isValidPostCategoryKey("fundraising"), true);
  });

  it("is case-insensitive (admin data may not be lowercase)", () => {
    assert.strictEqual(isValidPostCategoryKey("General"), true);
    assert.strictEqual(isValidPostCategoryKey("FUNDRAISING"), true);
  });

  it("rejects any admin-added category that has no matching Post.category enum value", () => {
    assert.strictEqual(isValidPostCategoryKey("health_tips"), false);
    assert.strictEqual(isValidPostCategoryKey("adoption_stories"), false);
    assert.strictEqual(isValidPostCategoryKey(""), false);
  });
});

describe("applyFeelingSelection / applyActivitySelection / clearFeeling / clearActivity (Feeling + Activity coexist)", () => {
  it("selecting a Feeling sets feeling fields and does NOT clear an existing Activity", () => {
    const draft: FeelingActivityFields = {
      activityId: "walking",
      activityLabel: "Walking",
      activityEmoji: "🚶",
    };

    const result = applyFeelingSelection(draft, { key: "happy", label: "Happy", emoji: "😊" });

    assert.strictEqual(result.feelingId, "happy");
    assert.strictEqual(result.feelingLabel, "Happy");
    assert.strictEqual(result.feelingEmoji, "😊");
    // Activity, set before this call, must survive untouched.
    assert.strictEqual(result.activityId, "walking");
    assert.strictEqual(result.activityLabel, "Walking");
    assert.strictEqual(result.activityEmoji, "🚶");
  });

  it("selecting an Activity sets activity fields and does NOT clear an existing Feeling", () => {
    const draft: FeelingActivityFields = {
      feelingId: "happy",
      feelingLabel: "Happy",
      feelingEmoji: "😊",
    };

    const result = applyActivitySelection(draft, { key: "walking", label: "Walking", emoji: "🚶" });

    assert.strictEqual(result.activityId, "walking");
    assert.strictEqual(result.activityLabel, "Walking");
    assert.strictEqual(result.activityEmoji, "🚶");
    // Feeling, set before this call, must survive untouched.
    assert.strictEqual(result.feelingId, "happy");
    assert.strictEqual(result.feelingLabel, "Happy");
    assert.strictEqual(result.feelingEmoji, "😊");
  });

  it("Feeling AND Activity can both be set simultaneously by applying both in sequence, in either order", () => {
    const empty: FeelingActivityFields = {};

    const feelingFirst = applyActivitySelection(
      applyFeelingSelection(empty, { key: "happy", label: "Happy", emoji: "😊" }),
      { key: "playing", label: "Playing", emoji: "🎮" },
    );
    assert.strictEqual(feelingFirst.feelingId, "happy");
    assert.strictEqual(feelingFirst.activityId, "playing");

    const activityFirst = applyFeelingSelection(
      applyActivitySelection(empty, { key: "playing", label: "Playing", emoji: "🎮" }),
      { key: "happy", label: "Happy", emoji: "😊" },
    );
    assert.strictEqual(activityFirst.feelingId, "happy");
    assert.strictEqual(activityFirst.activityId, "playing");
  });

  it("changing Feeling while an Activity is set leaves Activity unchanged (e.g. Happy -> Excited, Activity stays Walking)", () => {
    const draft: FeelingActivityFields = {
      feelingId: "happy",
      feelingLabel: "Happy",
      feelingEmoji: "😊",
      activityId: "walking",
      activityLabel: "Walking",
      activityEmoji: "🚶",
    };

    const result = applyFeelingSelection(draft, { key: "excited", label: "Excited", emoji: "🤩" });

    assert.strictEqual(result.feelingId, "excited");
    assert.strictEqual(result.activityId, "walking");
    assert.strictEqual(result.activityLabel, "Walking");
  });

  it("changing Activity while a Feeling is set leaves Feeling unchanged (e.g. Playing -> Walking, Feeling stays Happy)", () => {
    const draft: FeelingActivityFields = {
      feelingId: "happy",
      feelingLabel: "Happy",
      activityId: "playing",
      activityLabel: "Playing",
    };

    const result = applyActivitySelection(draft, { key: "walking", label: "Walking", emoji: "🚶" });

    assert.strictEqual(result.activityId, "walking");
    assert.strictEqual(result.feelingId, "happy");
    assert.strictEqual(result.feelingLabel, "Happy");
  });

  it("clearFeeling removes only the Feeling fields, leaving Activity untouched", () => {
    const draft: FeelingActivityFields = {
      feelingId: "happy",
      feelingLabel: "Happy",
      feelingEmoji: "😊",
      activityId: "playing",
      activityLabel: "Playing",
      activityEmoji: "🎮",
    };

    const result = clearFeeling(draft);

    assert.strictEqual(result.feelingId, undefined);
    assert.strictEqual(result.feelingLabel, undefined);
    assert.strictEqual(result.feelingEmoji, undefined);
    assert.strictEqual(result.activityId, "playing");
    assert.strictEqual(result.activityLabel, "Playing");
    assert.strictEqual(result.activityEmoji, "🎮");
  });

  it("clearActivity removes only the Activity fields, leaving Feeling untouched", () => {
    const draft: FeelingActivityFields = {
      feelingId: "happy",
      feelingLabel: "Happy",
      feelingEmoji: "😊",
      activityId: "playing",
      activityLabel: "Playing",
      activityEmoji: "🎮",
    };

    const result = clearActivity(draft);

    assert.strictEqual(result.activityId, undefined);
    assert.strictEqual(result.activityLabel, undefined);
    assert.strictEqual(result.activityEmoji, undefined);
    assert.strictEqual(result.feelingId, "happy");
    assert.strictEqual(result.feelingLabel, "Happy");
    assert.strictEqual(result.feelingEmoji, "😊");
  });

  it("does not mutate the input draft object", () => {
    const draft = { feelingId: "happy" };
    const result = applyActivitySelection(draft, { key: "walking", label: "Walking" });
    assert.strictEqual(draft.feelingId, "happy");
    assert.notStrictEqual(result, draft);
  });
});

describe("isOverCaptionLimit (§29)", () => {
  it("accepts a caption below the maximum", () => {
    assert.strictEqual(isOverCaptionLimit(100, 5000), false);
  });

  it("accepts a caption exactly at the maximum", () => {
    assert.strictEqual(isOverCaptionLimit(5000, 5000), false);
  });

  it("rejects a caption one character over the maximum", () => {
    assert.strictEqual(isOverCaptionLimit(5001, 5000), true);
  });
});

describe("isBackgroundEligible (§14, §16, §30)", () => {
  it("eligible: no media, caption below the background limit", () => {
    assert.strictEqual(isBackgroundEligible(0, 200, 300), true);
  });

  it("eligible: no media, caption exactly at the background limit", () => {
    assert.strictEqual(isBackgroundEligible(0, 300, 300), true);
  });

  it("not eligible: no media, caption one character over the background limit", () => {
    assert.strictEqual(isBackgroundEligible(0, 301, 300), false);
  });

  it("not eligible: caption within the background limit but media is attached", () => {
    assert.strictEqual(isBackgroundEligible(1, 50, 300), false);
  });

  it("not eligible: both media attached AND caption over the background limit", () => {
    assert.strictEqual(isBackgroundEligible(2, 500, 300), false);
  });
});

describe("shouldClearBackgroundForCaptionLength (§15, §30)", () => {
  it("clears when a background is selected and the new length crosses the limit", () => {
    assert.strictEqual(shouldClearBackgroundForCaptionLength(true, 301, 300), true);
  });

  it("does not clear when the new length is still within the limit", () => {
    assert.strictEqual(shouldClearBackgroundForCaptionLength(true, 300, 300), false);
  });

  it("does not clear when no background is selected, even if over the limit (nothing to clear)", () => {
    assert.strictEqual(shouldClearBackgroundForCaptionLength(false, 301, 300), false);
  });

  it("does not clear existing caption content — this function only ever decides the background field", () => {
    // Documented by the return type itself (boolean, not a caption
    // transform) — this test exists to make that contract explicit and
    // catch a future accidental signature change.
    const result = shouldClearBackgroundForCaptionLength(true, 5000, 300);
    assert.strictEqual(typeof result, "boolean");
  });
});

describe("shouldClearBackgroundForMedia (§17, §18, §31)", () => {
  it("clears the background when media is added to a previously media-less, backgrounded draft", () => {
    assert.strictEqual(shouldClearBackgroundForMedia(true, 0), true);
  });

  it("does not clear when there was no background selected", () => {
    assert.strictEqual(shouldClearBackgroundForMedia(false, 0), false);
  });

  it("does not re-fire once the draft already had media before this addition (background was already cleared on the first crossing)", () => {
    assert.strictEqual(shouldClearBackgroundForMedia(true, 1), false);
  });
});

describe("togglePetSelection", () => {
  it("adds a pet id not yet present", () => {
    assert.deepStrictEqual(togglePetSelection([1, 2], 3), [1, 2, 3]);
  });

  it("removes a pet id already present", () => {
    assert.deepStrictEqual(togglePetSelection([1, 2, 3], 2), [1, 3]);
  });

  it("starts from empty", () => {
    assert.deepStrictEqual(togglePetSelection([], 5), [5]);
  });
});

describe("toggleContentTagSelection", () => {
  it("adds a tag id not yet present", () => {
    assert.deepStrictEqual(toggleContentTagSelection([10], 20), [10, 20]);
  });

  it("removes a tag id already present", () => {
    assert.deepStrictEqual(toggleContentTagSelection([10, 20], 10), [20]);
  });
});
