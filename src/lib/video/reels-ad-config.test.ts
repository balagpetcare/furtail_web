import { test, describe } from "node:test";
import * as assert from "node:assert";
import {
  shouldBeSponsored,
  getNextSponsoredPosition,
  getImpressionThresholdLabel,
} from "./reels-ad-config";

describe("Reels Ad Config", () => {
  describe("shouldBeSponsored", () => {
    test("returns false if frequency <= 1", () => {
      assert.strictEqual(shouldBeSponsored(0, 0), false);
      assert.strictEqual(shouldBeSponsored(5, 1), false);
    });

    test("with frequency 3: positions 2, 5, 8, 11 are sponsored", () => {
      const frequency = 3;
      // Pattern: organic, organic, sponsored, repeat
      assert.strictEqual(shouldBeSponsored(0, frequency), false);
      assert.strictEqual(shouldBeSponsored(1, frequency), false);
      assert.strictEqual(shouldBeSponsored(2, frequency), true); // 3rd position (index 2)
      assert.strictEqual(shouldBeSponsored(3, frequency), false);
      assert.strictEqual(shouldBeSponsored(4, frequency), false);
      assert.strictEqual(shouldBeSponsored(5, frequency), true); // 6th position (index 5)
      assert.strictEqual(shouldBeSponsored(8, frequency), true); // 9th position (index 8)
      assert.strictEqual(shouldBeSponsored(11, frequency), true); // 12th position (index 11)
    });

    test("with frequency 2: every other position is sponsored", () => {
      const frequency = 2;
      assert.strictEqual(shouldBeSponsored(0, frequency), false);
      assert.strictEqual(shouldBeSponsored(1, frequency), true);
      assert.strictEqual(shouldBeSponsored(2, frequency), false);
      assert.strictEqual(shouldBeSponsored(3, frequency), true);
      assert.strictEqual(shouldBeSponsored(4, frequency), false);
      assert.strictEqual(shouldBeSponsored(5, frequency), true);
    });

    test("with frequency 5: every 5th position is sponsored", () => {
      const frequency = 5;
      assert.strictEqual(shouldBeSponsored(0, frequency), false);
      assert.strictEqual(shouldBeSponsored(3, frequency), false);
      assert.strictEqual(shouldBeSponsored(4, frequency), true); // 5th position
      assert.strictEqual(shouldBeSponsored(9, frequency), true); // 10th position
      assert.strictEqual(shouldBeSponsored(14, frequency), true); // 15th position
    });
  });

  describe("getNextSponsoredPosition", () => {
    test("returns -1 if frequency <= 1", () => {
      assert.strictEqual(getNextSponsoredPosition(0, 0), -1);
      assert.strictEqual(getNextSponsoredPosition(5, 1), -1);
    });

    test("finds next sponsored with frequency 3", () => {
      const frequency = 3;
      assert.strictEqual(getNextSponsoredPosition(0, frequency), 2); // Next sponsored at 2
      assert.strictEqual(getNextSponsoredPosition(1, frequency), 2);
      assert.strictEqual(getNextSponsoredPosition(2, frequency), 5); // Next after 2 is 5
      assert.strictEqual(getNextSponsoredPosition(5, frequency), 8);
      assert.strictEqual(getNextSponsoredPosition(10, frequency), 11);
    });

    test("respects lookahead limit", () => {
      const frequency = 10;
      const limit = 5; // 5-position lookahead
      // Next sponsored after 0 would be at position 9, outside 5-position limit (ends at 5)
      assert.strictEqual(getNextSponsoredPosition(0, frequency, limit), -1);
      // Next sponsored after 5 would be at position 9, within 5-position limit (ends at 10)
      assert.strictEqual(getNextSponsoredPosition(5, frequency, limit), 9);
      // Next after 10 would be at 19, outside 5-position lookahead from 10 (ends at 15)
      assert.strictEqual(getNextSponsoredPosition(10, frequency, limit), -1);
    });

    test("handles large position numbers", () => {
      const frequency = 3;
      assert.strictEqual(getNextSponsoredPosition(1000, frequency), 1001); // 1001 % 3 = 2, which is sponsored
      assert.strictEqual(getNextSponsoredPosition(9999, frequency), 10001);
    });
  });

  describe("getImpressionThresholdLabel", () => {
    test("formats milliseconds < 1000", () => {
      assert.strictEqual(getImpressionThresholdLabel(100), "100ms");
      assert.strictEqual(getImpressionThresholdLabel(750), "750ms");
    });

    test("formats seconds >= 1000", () => {
      assert.strictEqual(getImpressionThresholdLabel(1000), "1.0s");
      assert.strictEqual(getImpressionThresholdLabel(2500), "2.5s");
      assert.strictEqual(getImpressionThresholdLabel(5000), "5.0s");
    });
  });
});
