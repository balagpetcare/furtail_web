/**
 * Pure, DOM-free business rules extracted out of create-post-modal.tsx so
 * they're unit-testable under this project's node:test runner (no jsdom/
 * React Testing Library configured — see create-post-modal.interaction.test.ts
 * for why true interaction tests aren't possible here yet).
 */

export const POST_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "HEALTH_UPDATE", label: "Health Update" },
  { value: "VACCINATION", label: "Vaccination" },
  { value: "LOST_PET", label: "Lost Pet" },
  { value: "ADOPTION", label: "Adoption" },
  { value: "SERVICE_REVIEW", label: "Service Review" },
] as const;

export function getPostTypeLabel(postTypeValue: string): string {
  return POST_TYPES.find((pt) => pt.value === postTypeValue)?.label ?? "General";
}

/** Post.category is a stable GENERAL/FUNDRAISING enum, distinct from the
 * admin-managed PostCategoryTaxonomy list the Category quick pick reads
 * options from — only these two keys round-trip onto a real Post. */
const VALID_POST_CATEGORY_KEYS = new Set(["general", "fundraising"]);

export function isValidPostCategoryKey(key: string): boolean {
  return VALID_POST_CATEGORY_KEYS.has(key.toLowerCase());
}

export interface FeelingActivityFields {
  feelingId?: string;
  feelingLabel?: string;
  feelingEmoji?: string;
  activityId?: string;
  activityLabel?: string;
  activityEmoji?: string;
}

/** Sets the selected Feeling. Feeling and Activity are independent
 * fields — this must NEVER touch activityId/activityLabel/activityEmoji.
 * (Selector UX Unification: a prior mutual-exclusion rule that cleared
 * Activity here was removed — the backend has no such constraint, and a
 * post can legitimately be both "Happy" and "Playing" at once.) */
export function applyFeelingSelection<T extends FeelingActivityFields>(
  draft: T,
  option: { key: string; label: string; emoji?: string }
): T {
  return {
    ...draft,
    feelingId: option.key,
    feelingLabel: option.label,
    feelingEmoji: option.emoji,
  };
}

/** Sets the selected Activity. Must NEVER touch feelingId/feelingLabel/
 * feelingEmoji — see applyFeelingSelection above. */
export function applyActivitySelection<T extends FeelingActivityFields>(
  draft: T,
  option: { key: string; label: string; emoji?: string }
): T {
  return {
    ...draft,
    activityId: option.key,
    activityLabel: option.label,
    activityEmoji: option.emoji,
  };
}

/** Clears only the Feeling fields — Activity, if any, is left untouched. */
export function clearFeeling<T extends FeelingActivityFields>(draft: T): T {
  return {
    ...draft,
    feelingId: undefined,
    feelingLabel: undefined,
    feelingEmoji: undefined,
  };
}

/** Clears only the Activity fields — Feeling, if any, is left untouched. */
export function clearActivity<T extends FeelingActivityFields>(draft: T): T {
  return {
    ...draft,
    activityId: undefined,
    activityLabel: undefined,
    activityEmoji: undefined,
  };
}

// ── Text limit + background/media exclusivity (SELECTOR ICONS + TEXT
// SCROLL + TEXT LIMIT + BACKGROUND/MEDIA EXCLUSIVITY) ───────────────────
// Pure decision rules for the composer's caption-length and background-
// eligibility policy, extracted so they're unit-testable without a
// component harness (this project has none — see the interaction test
// files' own doc comments) and so create-post-modal.tsx has exactly one
// place each rule is expressed, not an inline duplicate.

/** The overall caption cap has been exceeded — submission must be
 * blocked (canSubmit), and the counter should show its error state. */
export function isOverCaptionLimit(captionLength: number, maxCaptionCharacters: number): boolean {
  return captionLength > maxCaptionCharacters;
}

/** A background is only offered while the post has no media AND the
 * caption is still within the (typically much smaller) background-
 * eligible length — a background is a short-status-post feature, and it
 * would be immediately discarded on submit outside this window. */
export function isBackgroundEligible(
  mediaCount: number,
  captionLength: number,
  maxBackgroundCaptionCharacters: number,
): boolean {
  return mediaCount === 0 && captionLength <= maxBackgroundCaptionCharacters;
}

/** Typing or pasting has pushed the caption past the background-eligible
 * length while a background is currently selected — the background must
 * be cleared (caption text itself is never touched). True only when both
 * a background is actually selected AND the new length crosses the line;
 * merely being over the limit with no background selected is a no-op. */
export function shouldClearBackgroundForCaptionLength(
  hasBackgroundSelected: boolean,
  newCaptionLength: number,
  maxBackgroundCaptionCharacters: number,
): boolean {
  return hasBackgroundSelected && newCaptionLength > maxBackgroundCaptionCharacters;
}

/** Media is being attached to a draft that previously had none, while a
 * background is currently selected — media and a text background are
 * mutually exclusive (§17), so the background must be cleared. Keyed off
 * "previously had none" (not "will have some") because once a draft has
 * any media, the background swatches are already hidden entirely
 * (isBackgroundEligible), so this transition only needs to fire once, on
 * the 0 -> N crossing. */
export function shouldClearBackgroundForMedia(
  hasBackgroundSelected: boolean,
  mediaCountBeforeAdd: number,
): boolean {
  return hasBackgroundSelected && mediaCountBeforeAdd === 0;
}

export function togglePetSelection(taggedPetIds: number[], petId: number): number[] {
  return taggedPetIds.includes(petId)
    ? taggedPetIds.filter((id) => id !== petId)
    : [...taggedPetIds, petId];
}

export function toggleContentTagSelection(contentTagIds: number[], tagId: number): number[] {
  return contentTagIds.includes(tagId)
    ? contentTagIds.filter((id) => id !== tagId)
    : [...contentTagIds, tagId];
}
