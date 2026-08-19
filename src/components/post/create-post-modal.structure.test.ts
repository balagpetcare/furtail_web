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

  it("the footer contains only the Post button — no Photo/Video/Emoji/Background there", () => {
    const footerStart = modalSource.indexOf("{/* Footer");
    assert.ok(footerStart !== -1, "expected a Footer comment marker");
    const footerSection = modalSource.slice(footerStart);
    assert.ok(!footerSection.includes("ImageIcon"));
    assert.ok(!footerSection.includes("EmojiPopover"));
    assert.ok(!footerSection.includes("BackgroundStylesScroller"));
  });

  it("Photo/Video are NOT rendered inside the Quick Picks toolbar (moved below the caption/background row)", () => {
    const toolbarStart = modalSource.indexOf('role="toolbar"');
    const toolbarEnd = modalSource.indexOf("</div>", toolbarStart);
    const toolbarSection = modalSource.slice(toolbarStart, toolbarEnd);
    assert.ok(!toolbarSection.includes("Select Photo"));
    assert.ok(!toolbarSection.includes("Select Video"));
    assert.ok(!toolbarSection.includes("EmojiPopover"));
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

describe("CreatePostModal — exact FINAL LAYOUT REFINEMENT hierarchy", () => {
  // Locates each landmark's FIRST occurrence in source order and asserts
  // the required sequence: CaptionEditorWithPreview -> BackgroundStylesScroller
  // -> Photo/Video action block -> MediaPreviewGrid.
  function firstIndexOf(marker: string): number {
    const index = modalSource.indexOf(marker);
    assert.ok(index !== -1, `expected to find "${marker}" in create-post-modal.tsx`);
    return index;
  }

  it("CaptionEditorWithPreview appears before BackgroundStylesScroller", () => {
    const captionIndex = firstIndexOf("<CaptionEditorWithPreview");
    const backgroundIndex = firstIndexOf("<BackgroundStylesScroller");
    assert.ok(captionIndex < backgroundIndex, "expected text area before background row");
  });

  it("BackgroundStylesScroller appears before the Photo/Video action block", () => {
    const backgroundIndex = firstIndexOf("<BackgroundStylesScroller");
    const photoActionIndex = firstIndexOf("Select Photo");
    assert.ok(backgroundIndex < photoActionIndex, "expected background row before Photo/Video actions");
  });

  it("Photo/Video action block appears before MediaPreviewGrid", () => {
    const photoActionIndex = firstIndexOf("Select Photo");
    const mediaGridIndex = firstIndexOf("<MediaPreviewGrid");
    assert.ok(photoActionIndex < mediaGridIndex, "expected Photo/Video actions before media previews");
  });

  it("Photo and Video actions are labeled 'Select Photo' / 'Select Video' and appear exactly once each", () => {
    const photoMatches = modalSource.match(/Select Photo/g) || [];
    const videoMatches = modalSource.match(/Select Video/g) || [];
    assert.strictEqual(photoMatches.length, 1);
    assert.strictEqual(videoMatches.length, 1);
  });

  it("does not import EmojiPopover directly into the modal (it now lives inside CaptionEditorWithPreview)", () => {
    assert.ok(!modalSource.includes('from "@/components/post/emoji-popover"'));
    assert.ok(!modalSource.includes("<EmojiPopover"));
  });

  it("renders exactly one CaptionEditorWithPreview, one BackgroundStylesScroller, one MediaPreviewGrid", () => {
    const count = (marker: string) => (modalSource.match(new RegExp(marker, "g")) || []).length;
    assert.strictEqual(count("<CaptionEditorWithPreview"), 1);
    assert.strictEqual(count("<BackgroundStylesScroller"), 1);
    assert.strictEqual(count("<MediaPreviewGrid"), 1);
  });
});

describe("CaptionEditorWithPreview — bordered field + embedded Emoji", () => {
  const editorSource = readFileSync(join(__dirname, "caption-editor-with-preview.tsx"), "utf-8");

  it("renders exactly one Emoji control, inside its own JSX (not the modal's)", () => {
    const matches = editorSource.match(/<EmojiPopover/g) || [];
    assert.strictEqual(matches.length, 1);
  });

  it("the default (no background) state uses a light border and soft rounded corners, not a heavy/dark border", () => {
    assert.ok(editorSource.includes("border-gray-200"));
    assert.ok(editorSource.includes("rounded-2xl"));
    assert.ok(!editorSource.includes("border-black"));
    assert.ok(!editorSource.includes("border-gray-900"));
    assert.ok(!editorSource.includes("border-gray-800"));
  });

  it("has a soft focus-within state (not a jarring hard outline)", () => {
    assert.ok(editorSource.includes("focus-within:"));
  });

  it("Emoji is positioned inside the editor's own corner via absolute positioning on a relative wrapper", () => {
    assert.ok(editorSource.includes("relative"));
    assert.ok(editorSource.includes("absolute"));
    assert.ok(editorSource.includes("bottom-2.5") || editorSource.includes("bottom-2") || editorSource.includes("bottom-3"));
    assert.ok(editorSource.includes("right-2.5") || editorSource.includes("right-2") || editorSource.includes("right-3"));
  });

  it("the textarea reserves right padding so its text cannot render underneath the Emoji button", () => {
    assert.ok(/pr-\d/.test(editorSource));
  });

  it("the textarea has an accessible label", () => {
    assert.ok(editorSource.includes('aria-label="Post caption"'));
  });
});

describe("EmojiPopover — accessible name and no duplicate control", () => {
  const emojiSource = readFileSync(join(__dirname, "emoji-popover.tsx"), "utf-8");

  it('exposes aria-label="Add emoji" on its trigger', () => {
    assert.ok(emojiSource.includes('aria-label="Add emoji"'));
  });

  it("supports a compact embedded mode for use inside the editor", () => {
    assert.ok(emojiSource.includes("compact"));
  });
});
