import { describe, it } from "node:test";
import * as assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Source-level regression guards for the COMMAND 02 compact composer
 * redesign. This project's test runner (node:test) has no jsdom/React
 * Testing Library configured, so real interaction tests ("click the
 * Feeling chip, assert the popover opens") aren't possible here — these
 * assertions instead directly encode the "must not reappear" requirements
 * from the spec against the component's actual source text, so a future
 * regression (someone pasting the old footer back in) fails a real test
 * instead of only being caught by manual QA.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const modalSource = readFileSync(join(__dirname, "create-post-modal.tsx"), "utf-8");

describe("CreatePostModal — no removed UI survives", () => {
  it('does not contain the old "Add to your post" footer label', () => {
    assert.ok(!modalSource.includes("Add to your post"));
  });

  it('does not render a "More" options menu/button', () => {
    assert.ok(!modalSource.includes("MoreHorizontal"));
    assert.ok(!/>\s*More\s*<\/(span|button)/.test(modalSource));
    assert.ok(!modalSource.includes("More options"));
  });

  it('does not contain a permanent full-width "Add location" input', () => {
    assert.ok(!modalSource.includes('placeholder="Add location"'));
  });

  it("does not import the deleted duplicate-control components", () => {
    assert.ok(!modalSource.includes("MediaActionBar"));
    assert.ok(!modalSource.includes("CreatePostMetadataRow"));
  });

  it('does not contain a "Background" label/button (swatches speak for themselves)', () => {
    assert.ok(!modalSource.includes(">Background<"));
    assert.ok(!modalSource.includes("Select background"));
  });

  it("does not define a hardcoded BACKGROUND_STYLES constant", () => {
    assert.ok(!modalSource.includes("BACKGROUND_STYLES"));
  });

  it("has exactly one Quick Picks row (single toolbar), not scattered duplicate controls", () => {
    const toolbarMatches = modalSource.match(/role="toolbar"/g) || [];
    assert.strictEqual(toolbarMatches.length, 1);
  });

  it("renders Photo/Video/Emoji inside the Quick Picks row, not a separate bottom action bar", () => {
    // The footer section (after the last closing of the scrollable body div)
    // must only contain the Post button, not another Photo/Video/Emoji set.
    const footerStart = modalSource.indexOf("{/* Footer");
    assert.ok(footerStart !== -1, "expected a Footer comment marker");
    const footerSection = modalSource.slice(footerStart);
    assert.ok(!footerSection.includes("ImageIcon"));
    assert.ok(!footerSection.includes("EmojiPopover"));
  });

  it("caption placeholder matches the required copy", () => {
    const editorSource = readFileSync(join(__dirname, "caption-editor-with-preview.tsx"), "utf-8");
    assert.ok(editorSource.includes("What's happening in your pet world?"));
  });

  it("background swatches render in a single scrollable row (no flex-wrap)", () => {
    const scrollerPath = join(__dirname, "background-styles-scroller.tsx");
    const scrollerSource = readFileSync(scrollerPath, "utf-8");
    assert.ok(scrollerSource.includes("overflow-x-auto"));
    assert.ok(!scrollerSource.includes("flex-wrap"));
    assert.ok(!scrollerSource.includes(">Background<"));
  });

  it("background swatches are sourced from the database-backed query, not a local constant", () => {
    assert.ok(modalSource.includes("useBackgroundStyles"));
    assert.ok(!modalSource.includes("const BACKGROUND_STYLES"));
  });
});
