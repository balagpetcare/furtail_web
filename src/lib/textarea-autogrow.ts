/**
 * Pure, DOM-free auto-grow threshold rule for CaptionEditorWithPreview's
 * textarea. Extracted out so the actual decision (grow vs. cap-and-scroll)
 * is unit-testable under this project's node:test runner (no jsdom
 * configured, so real layout/pixel measurement can't be exercised here —
 * see caption-editor-scroll.test.ts for what this covers and what it
 * can't).
 */
export interface AutoGrowResult {
  /** The height (px) the textarea's own `style.height` should be set to. */
  height: number;
  /** 'hidden' while content still fits within maxHeight (no scrollbar,
   * matching the original auto-grow-only behavior); 'auto' once content
   * exceeds it, so the browser's native scrolling takes over instead of
   * silently clipping the extra text. Never 'hidden' once scrollHeight
   * exceeds maxHeight — that was the original bug this fixes. */
  overflowY: 'hidden' | 'auto';
}

export function computeAutoGrowHeight(scrollHeight: number, maxHeight: number): AutoGrowResult {
  if (scrollHeight <= maxHeight) {
    return { height: scrollHeight, overflowY: 'hidden' };
  }
  return { height: maxHeight, overflowY: 'auto' };
}
