/**
 * Pure, DOM-free helpers for computing what a compact selector trigger
 * should display (e.g. "Feeling" -> "Happy", or "Tags" -> "Dogs +2") —
 * shared by PopoverPicker, PetTagPopover, and any other closed-selector
 * trigger, so summarization behaves identically everywhere instead of
 * being reimplemented per component. No React/DOM dependency here:
 * testable under this project's node:test runner (no jsdom configured).
 */

export interface DisplayLabeled {
  label: string;
}

export interface SelectorDisplay {
  label: string;
  selected: boolean;
}

/**
 * Single-select trigger display. An explicit `selectedLabel` wins (covers
 * a value the draft already cached before its options list finished
 * loading — e.g. Category); otherwise the selected key is looked up in the
 * currently loaded options; otherwise the trigger falls back to its
 * placeholder, unselected.
 */
export function computeSingleSelectDisplay<T extends DisplayLabeled & { key: string }>(
  options: T[] | null | undefined,
  selectedKey: string | null | undefined,
  selectedLabel: string | null | undefined,
  placeholder: string,
): SelectorDisplay {
  if (selectedLabel) return { label: selectedLabel, selected: true };
  if (selectedKey) {
    const found = (options || []).find((option) => option.key === selectedKey);
    if (found) return { label: found.label, selected: true };
  }
  return { label: placeholder, selected: false };
}

/**
 * Multi-select trigger summary: the placeholder when nothing is selected,
 * the single item's own label when exactly one is selected, or
 * "<first label> +<n more>" otherwise (e.g. "Dogs +2", "Bruno +2"). Order
 * follows `selectedItems` as given by the caller (which follows the
 * options list order, not selection order), so the summary is stable
 * regardless of the order items were picked in.
 */
export function summarizeMultiSelectLabel<T extends DisplayLabeled>(
  selectedItems: T[],
  placeholder: string,
): SelectorDisplay {
  if (selectedItems.length === 0) return { label: placeholder, selected: false };
  if (selectedItems.length === 1) return { label: selectedItems[0]!.label, selected: true };
  return { label: `${selectedItems[0]!.label} +${selectedItems.length - 1}`, selected: true };
}
