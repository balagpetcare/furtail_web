import { describe, it } from "node:test";
import * as assert from "node:assert";
import { computeAutoGrowHeight } from "./textarea-autogrow";

describe("computeAutoGrowHeight", () => {
  it("short content: grows to its natural height and stays non-scrollable (overflowY hidden)", () => {
    const result = computeAutoGrowHeight(80, 200);
    assert.deepStrictEqual(result, { height: 80, overflowY: "hidden" });
  });

  it("content exactly at the max: still non-scrollable", () => {
    const result = computeAutoGrowHeight(200, 200);
    assert.deepStrictEqual(result, { height: 200, overflowY: "hidden" });
  });

  it("content above the max: height is capped at max and overflowY becomes auto (scrollable) — never 'hidden'", () => {
    const result = computeAutoGrowHeight(900, 200);
    assert.deepStrictEqual(result, { height: 200, overflowY: "auto" });
    assert.notStrictEqual(result.overflowY, "hidden");
  });

  it("height never exceeds maxHeight regardless of how much content there is", () => {
    for (const scrollHeight of [201, 500, 5000, 50000]) {
      const result = computeAutoGrowHeight(scrollHeight, 200);
      assert.ok(result.height <= 200);
    }
  });

  it("applies the same rule independent of which maxHeight is passed (normal vs. background-preview ceilings)", () => {
    assert.deepStrictEqual(computeAutoGrowHeight(250, 260), { height: 250, overflowY: "hidden" });
    assert.deepStrictEqual(computeAutoGrowHeight(300, 260), { height: 260, overflowY: "auto" });
  });
});
