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

/** Selecting a Feeling clears any selected Activity — canonical
 * mutual-exclusion rule (COMMAND 02 §8). */
export function applyFeelingSelection<T extends FeelingActivityFields>(
  draft: T,
  option: { key: string; label: string; emoji?: string }
): T {
  return {
    ...draft,
    feelingId: option.key,
    feelingLabel: option.label,
    feelingEmoji: option.emoji,
    activityId: undefined,
    activityLabel: undefined,
    activityEmoji: undefined,
  };
}

/** Selecting an Activity clears any selected Feeling — same rule, other
 * direction. */
export function applyActivitySelection<T extends FeelingActivityFields>(
  draft: T,
  option: { key: string; label: string; emoji?: string }
): T {
  return {
    ...draft,
    activityId: option.key,
    activityLabel: option.label,
    activityEmoji: option.emoji,
    feelingId: undefined,
    feelingLabel: undefined,
    feelingEmoji: undefined,
  };
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
