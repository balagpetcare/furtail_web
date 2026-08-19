import { describe, it } from "node:test";
import * as assert from "node:assert";
import { computeSingleSelectDisplay, summarizeMultiSelectLabel } from "./selector-display";

describe("computeSingleSelectDisplay", () => {
  const options = [
    { key: "general", label: "General" },
    { key: "lost_pet", label: "Lost Pet" },
  ];

  it("falls back to the placeholder when nothing is selected", () => {
    const result = computeSingleSelectDisplay(options, undefined, undefined, "Category");
    assert.deepStrictEqual(result, { label: "Category", selected: false });
  });

  it("looks the selected key up in options when no explicit label is given (Post Type trigger displays the selected value)", () => {
    const result = computeSingleSelectDisplay(options, "lost_pet", undefined, "General");
    assert.deepStrictEqual(result, { label: "Lost Pet", selected: true });
  });

  it("prefers an explicit selectedLabel over looking the key up (Category selector: cached label wins)", () => {
    const result = computeSingleSelectDisplay(options, "general", "General (cached)", "Category");
    assert.deepStrictEqual(result, { label: "General (cached)", selected: true });
  });

  it("falls back to the placeholder if the selected key isn't found in the currently loaded options", () => {
    const result = computeSingleSelectDisplay(options, "does_not_exist", undefined, "Category");
    assert.deepStrictEqual(result, { label: "Category", selected: false });
  });

  it("handles a null/undefined options list gracefully", () => {
    const result = computeSingleSelectDisplay(null, "general", undefined, "Category");
    assert.deepStrictEqual(result, { label: "Category", selected: false });
  });
});

describe("summarizeMultiSelectLabel", () => {
  it("falls back to the placeholder when nothing is selected (Tags selector displays placeholder)", () => {
    const result = summarizeMultiSelectLabel([], "Tags");
    assert.deepStrictEqual(result, { label: "Tags", selected: false });
  });

  it("shows the single item's own label when exactly one is selected (Tags selector displays selected tag)", () => {
    const result = summarizeMultiSelectLabel([{ label: "Dogs" }], "Tags");
    assert.deepStrictEqual(result, { label: "Dogs", selected: true });
  });

  it('summarizes as "<first> +<n more>" for multiple selections (Tags/Pet selector summarizes selection)', () => {
    const result = summarizeMultiSelectLabel(
      [{ label: "Dogs" }, { label: "Health" }, { label: "Training" }],
      "Tags",
    );
    assert.deepStrictEqual(result, { label: "Dogs +2", selected: true });
  });

  it("applies the same summarization rule to Pet selection (Bruno +2)", () => {
    const result = summarizeMultiSelectLabel(
      [{ label: "Bruno" }, { label: "Mimi" }, { label: "Max" }],
      "Pet",
    );
    assert.deepStrictEqual(result, { label: "Bruno +2", selected: true });
  });
});
