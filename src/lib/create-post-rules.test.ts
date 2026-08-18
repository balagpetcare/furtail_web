import { describe, it } from "node:test";
import * as assert from "node:assert";
import {
  getPostTypeLabel,
  isValidPostCategoryKey,
  applyFeelingSelection,
  applyActivitySelection,
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

describe("applyFeelingSelection / applyActivitySelection (mutual exclusion)", () => {
  it("selecting a Feeling sets feeling fields and clears any Activity", () => {
    const draft: FeelingActivityFields = {
      activityId: "walking",
      activityLabel: "Walking",
      activityEmoji: "🚶",
    };

    const result = applyFeelingSelection(draft, { key: "happy", label: "Happy", emoji: "😊" });

    assert.strictEqual(result.feelingId, "happy");
    assert.strictEqual(result.feelingLabel, "Happy");
    assert.strictEqual(result.feelingEmoji, "😊");
    assert.strictEqual(result.activityId, undefined);
    assert.strictEqual(result.activityLabel, undefined);
    assert.strictEqual(result.activityEmoji, undefined);
  });

  it("selecting an Activity sets activity fields and clears any Feeling", () => {
    const draft: FeelingActivityFields = {
      feelingId: "happy",
      feelingLabel: "Happy",
      feelingEmoji: "😊",
    };

    const result = applyActivitySelection(draft, { key: "walking", label: "Walking", emoji: "🚶" });

    assert.strictEqual(result.activityId, "walking");
    assert.strictEqual(result.activityLabel, "Walking");
    assert.strictEqual(result.activityEmoji, "🚶");
    assert.strictEqual(result.feelingId, undefined);
    assert.strictEqual(result.feelingLabel, undefined);
    assert.strictEqual(result.feelingEmoji, undefined);
  });

  it("does not mutate the input draft object", () => {
    const draft = { feelingId: "happy" };
    const result = applyActivitySelection(draft, { key: "walking", label: "Walking" });
    assert.strictEqual(draft.feelingId, "happy");
    assert.notStrictEqual(result, draft);
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
