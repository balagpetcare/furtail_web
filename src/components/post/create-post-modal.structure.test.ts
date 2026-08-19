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

  it("SCROLL FIX §9-10: never sets a permanent static overflow: 'hidden' on the textarea (the original bug — a static JSX style prop wins over adjustHeight's imperative fix once content exceeds max height)", () => {
    // Match only an actual JSX style-object property, not this test file's
    // own prose describing the bug (which necessarily contains the same
    // literal substring).
    assert.ok(!/style=\{\{[^}]*overflow:\s*['"]hidden['"]/.test(editorSource));
  });

  it("owns overflowY imperatively via the same code path that owns height, using the shared computeAutoGrowHeight rule", () => {
    assert.ok(editorSource.includes("el.style.overflowY"));
    assert.ok(editorSource.includes("computeAutoGrowHeight"));
    assert.ok(editorSource.includes("from '@/lib/textarea-autogrow'"));
  });

  it("does not attach a custom wheel/scroll event handler — native textarea scrolling is relied on once overflow is fixed (§10)", () => {
    assert.ok(!editorSource.includes("onWheel"));
    assert.ok(!editorSource.includes("addEventListener('wheel'"));
    assert.ok(!editorSource.includes('addEventListener("wheel"'));
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

/**
 * SELECTOR UX UNIFICATION — source-level guards for the removed × chip row
 * and the new selected-state wiring on each metadata selector. Same
 * rationale as the block comment at the top of this file: no jsdom/RTL
 * configured, so these assert against source text rather than a rendered
 * DOM. Pure Feeling/Activity coexistence logic itself is unit-tested with
 * real assertions (not source text) in create-post-rules.test.ts, and the
 * trigger-label computation itself in selector-display.test.ts — this file
 * only proves those functions/props are actually wired into the modal.
 */
describe("CreatePostModal — old × selected-metadata chip row is fully removed (§12)", () => {
  it("does not import or render SelectedChip anywhere", () => {
    assert.ok(!modalSource.includes("SelectedChip"));
  });

  it("does not contain the old 'Selected metadata' chip-row comment block", () => {
    assert.ok(!modalSource.includes("Selected metadata — one consistent chip design"));
  });

  it("does not render a Remove-aria-label pattern for feeling/activity/pet/location/tag chips", () => {
    assert.ok(!modalSource.includes("Remove ${"));
  });
});

describe("CreatePostModal — metadata selectors relabel themselves in place (§3-11)", () => {
  it("Post Type selector receives selectedKey and a selection-dependent icon (§3)", () => {
    const start = modalSource.indexOf("POST_TYPE_OPTIONS}");
    const end = modalSource.indexOf("/>", start);
    const block = modalSource.slice(start, end);
    assert.ok(block.includes("selectedKey={draft.postType}"));
    assert.ok(block.includes("POST_TYPE_ICONS[draft.postType]"));
  });

  it("Feeling selector receives selectedKey and an onClear (§4)", () => {
    const start = modalSource.indexOf("feelingsQuery.data");
    const end = modalSource.indexOf("/>", start);
    const block = modalSource.slice(start, end);
    assert.ok(block.includes("selectedKey={draft.feelingId}"));
    assert.ok(block.includes("onClear={"));
    assert.ok(block.includes("clearFeeling"));
  });

  it("Activity selector receives selectedKey and an onClear (§5)", () => {
    const start = modalSource.indexOf("activitiesQuery.data");
    const end = modalSource.indexOf("/>", start);
    const block = modalSource.slice(start, end);
    assert.ok(block.includes("selectedKey={draft.activityId}"));
    assert.ok(block.includes("onClear={"));
    assert.ok(block.includes("clearActivity"));
  });

  it("Category selector receives selectedKey + selectedLabel and an onClear (§10)", () => {
    const start = modalSource.indexOf("categoriesQuery.data");
    const end = modalSource.indexOf("<PopoverPicker", modalSource.indexOf("multiSelect"));
    const block = modalSource.slice(start, end);
    assert.ok(block.includes("selectedKey={draft.category"));
    assert.ok(block.includes("selectedLabel={draft.categoryLabel}"));
    assert.ok(block.includes("onClear={"));
  });

  it("Tags selector is multi-select with selectedKeys wired for trigger summarization (§11)", () => {
    const start = modalSource.lastIndexOf("multiSelect");
    const end = modalSource.indexOf("/>", start);
    const block = modalSource.slice(start, end);
    assert.ok(block.includes("selectedKeys={selectedTags.map"));
  });

  it("Pet selector (PetTagPopover) summarizes its own selection via summarizeMultiSelectLabel (§8)", () => {
    const petSource = readFileSync(join(__dirname, "pet-tag-popover.tsx"), "utf-8");
    assert.ok(petSource.includes("summarizeMultiSelectLabel"));
    assert.ok(!petSource.includes("SelectedChip"));
  });

  it("Location selector (LocationPopover) displays the saved value on its trigger (§9)", () => {
    const locationSource = readFileSync(join(__dirname, "location-popover.tsx"), "utf-8");
    assert.ok(locationSource.includes("label={value || 'Location'}"));
    assert.ok(!locationSource.includes("SelectedChip"));
  });

  it("PopoverPicker's multi-select trigger uses the shared summarization helper, not a bespoke implementation", () => {
    const pickerSource = readFileSync(
      join(__dirname, "..", "ui", "popover-picker.tsx"),
      "utf-8",
    );
    assert.ok(pickerSource.includes("summarizeMultiSelectLabel"));
    assert.ok(pickerSource.includes("computeSingleSelectDisplay"));
  });
});

describe("CreatePostModal — Public-style shared trigger family (§1, §14)", () => {
  it("every metadata selector renders via the shared SELECTOR_TRIGGER_CLASS / SelectorTriggerContent, not one-off markup", () => {
    const pickerSource = readFileSync(
      join(__dirname, "..", "ui", "popover-picker.tsx"),
      "utf-8",
    );
    assert.ok(pickerSource.includes("export const SELECTOR_TRIGGER_CLASS"));
    assert.ok(pickerSource.includes("export function SelectorTriggerContent"));
    const petSource = readFileSync(join(__dirname, "pet-tag-popover.tsx"), "utf-8");
    const locationSource = readFileSync(join(__dirname, "location-popover.tsx"), "utf-8");
    assert.ok(petSource.includes("SELECTOR_TRIGGER_CLASS"));
    assert.ok(petSource.includes("SelectorTriggerContent"));
    assert.ok(locationSource.includes("SELECTOR_TRIGGER_CLASS"));
    assert.ok(locationSource.includes("SelectorTriggerContent"));
  });

  it("Photo/Video action buttons keep their own distinct style (QUICK_PICK_TRIGGER_CLASS), unaffected by the selector unification", () => {
    assert.ok(modalSource.includes("QUICK_PICK_TRIGGER_CLASS"));
  });
});

describe("CreatePostModal — Quick Picks row wraps instead of scrolling on desktop (§2)", () => {
  it("the toolbar uses flex-wrap and does not horizontally scroll", () => {
    const toolbarStart = modalSource.indexOf('role="toolbar"');
    const toolbarOpenTagStart = modalSource.lastIndexOf("<div", toolbarStart);
    const toolbarOpenTag = modalSource.slice(toolbarOpenTagStart, toolbarStart);
    assert.ok(toolbarOpenTag.includes("flex-wrap"));
    assert.ok(!toolbarOpenTag.includes("overflow-x-auto"));
    assert.ok(!toolbarOpenTag.includes("scrollbar-hide"));
  });
});

describe("CreatePostModal — idempotency key is untouched by selector state changes (§20 idempotency proof)", () => {
  it("idempotencyKeyRef.current is assigned only in the open-reset effect and the mutation lifecycle, never inside a selector handler", () => {
    const assignmentPattern = /idempotencyKeyRef\.current\s*=/g;
    const assignments = modalSource.match(assignmentPattern) || [];
    // Known legitimate assignment sites: (1) reset to null when the modal
    // re-opens, (2) generated once inside mutationFn if still null, (3)
    // reset to null on successful submit. Exactly 3 — if this count grows,
    // something new is writing to it and must be justified explicitly.
    assert.strictEqual(assignments.length, 3);

    const toolbarStart = modalSource.indexOf('role="toolbar"');
    const toolbarEnd = modalSource.indexOf("{/* Text area, exactly as specified", toolbarStart);
    const toolbarSection = modalSource.slice(toolbarStart, toolbarEnd);
    assert.ok(
      !toolbarSection.includes("idempotencyKeyRef"),
      "no selector's onSelect/onClear/onToggle handler may touch idempotencyKeyRef",
    );
  });
});

/**
 * Disclosed limitation (§22 item 11 — "selector state survives ordinary
 * rerender"): this project has no jsdom/React Testing Library harness, so
 * an actual mount -> select Feeling -> trigger unrelated rerender -> assert
 * Feeling still selected test is not possible here. As a structural proxy,
 * every metadata selector below is rendered as a single static JSX element
 * (never inside a `.map()` with a derived `key`), so React has no reason to
 * unmount/remount it — and therefore no reason to lose the popover's own
 * internal open/search state — on an unrelated draft update. The actual
 * *data* (draft.feelingId etc.) lives in CreatePostModal's own useState and
 * is proven stable by the pure applyFeelingSelection/applyActivitySelection
 * tests in create-post-rules.test.ts, which is the part that genuinely
 * matters for "does selecting X reset Y" — rerender survival of that state
 * is a property of `useState` itself, not of this component's code.
 */
describe("CreatePostModal — metadata selectors are single static instances (§22 item 11 limitation proxy)", () => {
  it("Feeling/Activity/Category/Tags/PetTagPopover/LocationPopover are not rendered inside a .map() (no derived `key` prop that could force a remount)", () => {
    const toolbarStart = modalSource.indexOf('role="toolbar"');
    const toolbarEnd = modalSource.indexOf("{/* Text area, exactly as specified", toolbarStart);
    const toolbarSection = modalSource.slice(toolbarStart, toolbarEnd);
    assert.ok(!/\bkey=\{/.test(toolbarSection));
  });
});

/**
 * SELECTOR ICONS — every open-popup option row has its visual identity on
 * the left (§27). Post Type/General is explicitly excluded per §25 (user
 * confirmed it's already correct). Same source-text-assertion rationale
 * as the rest of this file: no jsdom/RTL harness to actually open a
 * popover and inspect a rendered row.
 */
describe("Selector option rows have a left-side visual (§1-8, §27)", () => {
  const pickerSource = readFileSync(join(__dirname, "..", "ui", "popover-picker.tsx"), "utf-8");
  const petSource = readFileSync(join(__dirname, "pet-tag-popover.tsx"), "utf-8");
  const locationSource = readFileSync(join(__dirname, "location-popover.tsx"), "utf-8");
  const optionRowSource = readFileSync(join(__dirname, "..", "ui", "selector-option-row.tsx"), "utf-8");

  it("PopoverPicker renders each row through the shared SelectorOptionRow, passing a leading visual", () => {
    assert.ok(pickerSource.includes("import { SelectorOptionRow }"));
    assert.ok(pickerSource.includes("<SelectorOptionRow"));
    assert.ok(pickerSource.includes("leading={leading}"));
  });

  it("PopoverPicker's leading visual prefers the option's own emoji and falls back to a domain fallbackIcon when absent", () => {
    assert.ok(pickerSource.includes("option.emoji"));
    assert.ok(pickerSource.includes("fallbackIcon"));
  });

  // Fixed-length window rather than searching for the next "/>", since a
  // prop like `triggerIcon={<SmileIcon ... />}` contains its own nested
  // self-closing "/>" that appears before the outer element's real closing
  // tag — naively searching for "/>" matches that inner one instead.
  const BLOCK_WINDOW = 1400;

  it("Feeling and Activity pickers pass a fallbackIcon for the defensive missing-emoji case (§2, §3)", () => {
    const feelingStart = modalSource.indexOf("feelingsQuery.data");
    const activityStart = modalSource.indexOf("activitiesQuery.data");
    const feelingBlock = modalSource.slice(feelingStart, feelingStart + BLOCK_WINDOW);
    const activityBlock = modalSource.slice(activityStart, activityStart + BLOCK_WINDOW);
    assert.ok(feelingBlock.includes("fallbackIcon"));
    assert.ok(activityBlock.includes("fallbackIcon"));
  });

  it("Category and Tags pickers no longer force showEmoji={false} with no fallback — each now has a stable fallbackIcon (§6, §7)", () => {
    const categoryStart = modalSource.indexOf("categoriesQuery.data");
    const tagsStart = modalSource.lastIndexOf("multiSelect");
    const categoryBlock = modalSource.slice(categoryStart, categoryStart + BLOCK_WINDOW);
    const tagsBlock = modalSource.slice(tagsStart, tagsStart + BLOCK_WINDOW);
    assert.ok(categoryBlock.includes("fallbackIcon"));
    assert.ok(tagsBlock.includes("fallbackIcon"));
  });

  it("Pet popup rows use SelectorOptionRow with an Avatar leading visual and a paw-icon fallback, not the pet's initial letter (§4)", () => {
    assert.ok(petSource.includes("SelectorOptionRow"));
    assert.ok(petSource.includes("<Avatar"));
    assert.ok(petSource.includes("<AvatarFallback"));
    assert.ok(petSource.includes("<PawPrint"));
    assert.ok(!/AvatarFallback[^>]*>\s*\{pet\.name\.charAt/.test(petSource));
  });

  it("Pet popup rows show a species/breed description line when available", () => {
    assert.ok(petSource.includes("description="));
  });

  it("Location popup's text input has a left-side MapPin icon (§5)", () => {
    const inputBlock = locationSource.slice(
      locationSource.indexOf("<label"),
      locationSource.indexOf("</form>"),
    );
    const mapPinMatches = inputBlock.match(/<MapPin/g) || [];
    assert.ok(mapPinMatches.length >= 1);
  });

  it("the shared SelectorOptionRow supports emoji/icon/avatar leading content plus an optional description and trailing override", () => {
    assert.ok(optionRowSource.includes("leading"));
    assert.ok(optionRowSource.includes("description"));
    assert.ok(optionRowSource.includes("trailing"));
  });

  it("the closed trigger still contains the selected visual + label after selection (Feeling/Activity keep their icon+label trigger)", () => {
    assert.ok(modalSource.includes('triggerIcon={<SmileIcon className="w-3.5 h-3.5" />}'));
    assert.ok(modalSource.includes('triggerIcon={<Zap className="w-3.5 h-3.5" />}'));
  });
});

/**
 * TEXT LIMIT + BACKGROUND ELIGIBILITY + MEDIA/BACKGROUND EXCLUSIVITY —
 * proves the modal wires the pure decision rules from create-post-rules.ts
 * (already unit-tested for correctness there) rather than reimplementing
 * the same logic inline and untested a second time.
 */
describe("Text limit, background eligibility, and media/background exclusivity are wired from create-post-rules.ts (§11-21, §27ff)", () => {
  it("imports and uses isOverCaptionLimit to gate submission, not an inline re-derivation", () => {
    assert.ok(modalSource.includes("isOverCaptionLimit,"));
    assert.ok(modalSource.includes("isOverCaptionLimit(draft.caption.length, maxCaptionCharacters)"));
    assert.ok(modalSource.includes("!overCaptionLimit"));
  });

  it("imports and uses isBackgroundEligible to gate the background swatch row's visibility", () => {
    assert.ok(modalSource.includes("isBackgroundEligible,"));
    assert.ok(
      modalSource.includes(
        "isBackgroundEligible(draft.media.length, draft.caption.length, maxBackgroundCaptionCharacters)",
      ),
    );
  });

  it("imports and uses shouldClearBackgroundForCaptionLength inside the caption onChange handler", () => {
    assert.ok(modalSource.includes("shouldClearBackgroundForCaptionLength,"));
    assert.ok(modalSource.includes("shouldClearBackgroundForCaptionLength("));
  });

  it("imports and uses shouldClearBackgroundForMedia inside the media-select handler", () => {
    assert.ok(modalSource.includes("shouldClearBackgroundForMedia,"));
    assert.ok(modalSource.includes("shouldClearBackgroundForMedia("));
  });

  it("caption text itself is never truncated by the background-eligibility auto-clear (only backgroundStyle is conditionally cleared)", () => {
    const onChangeStart = modalSource.indexOf("onChange={(value) => {", modalSource.indexOf("<CaptionEditorWithPreview"));
    const onChangeEnd = modalSource.indexOf("}}", onChangeStart);
    const onChangeBlock = modalSource.slice(onChangeStart, onChangeEnd);
    assert.ok(onChangeBlock.includes("caption: value"));
    assert.ok(!onChangeBlock.includes("value.slice"));
    assert.ok(!onChangeBlock.includes("value.substring"));
  });

  it("fetches the composer config from the backend and falls back to the shared FALLBACK_* constants, not separately-hardcoded numbers", () => {
    assert.ok(modalSource.includes("usePostComposerConfig"));
    assert.ok(modalSource.includes("FALLBACK_MAX_CAPTION_CHARACTERS"));
    assert.ok(modalSource.includes("FALLBACK_MAX_BACKGROUND_CAPTION_CHARACTERS"));
    // No bare numeric literal 5000 or 300 standing in for the config
    // anywhere outside the two fallback-constant usages themselves.
    assert.ok(!/maxCaptionCharacters\s*=\s*5000/.test(modalSource));
    assert.ok(!/maxBackgroundCaptionCharacters\s*=\s*300/.test(modalSource));
  });

  it("shows a character counter only near the limit, with an error state at/over it", () => {
    assert.ok(modalSource.includes("maxCaptionCharacters * 0.8"));
    assert.ok(modalSource.includes("text-red-600"));
  });

  it("the media-select and caption-onChange toasts use the exact wording from the spec", () => {
    assert.ok(
      modalSource.includes("Text background was removed because this post now contains media."),
    );
    assert.ok(modalSource.includes("Backgrounds are available for posts up to ${maxBackgroundCaptionCharacters} characters."));
  });
});
