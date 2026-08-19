'use client';

import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { TaxonomyOption } from '@/lib/api/taxonomies';
import { EmojiPopover } from '@/components/post/emoji-popover';
import { computeAutoGrowHeight } from '@/lib/textarea-autogrow';

/** Auto-grow ceiling (px) — below this, the textarea grows with content
 * and never scrolls; at/above it, height is capped and the browser's
 * native overflow-y: auto scrolling takes over. Two values because the
 * background-preview state renders larger, centered text. */
const MAX_EDITOR_HEIGHT = 200;
const MAX_EDITOR_HEIGHT_WITH_BACKGROUND = 260;

interface CaptionEditorWithPreviewProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  selectedBackgroundStyle?: TaxonomyOption | null;
  isDisabled?: boolean;
}

export interface CaptionEditorHandle {
  /** Inserts text at the current cursor position (replacing any selection)
   * and restores focus/caret — used by the Emoji control so emoji land
   * where the user was typing instead of always at the end. */
  insertAtCursor: (text: string) => void;
}

/**
 * The editing surface IS the background preview when a style is selected —
 * one element, not a duplicate read-only box stacked above a separate
 * plain textarea. In its default (no background) state it renders as a
 * proper modern text field: light border, soft rounded corners, gentle
 * focus ring — never a heavy/dark form-control border. The Emoji control
 * lives inside the editor's own bottom-right corner (not in the Quick
 * Picks row or any bottom toolbar) — see EmojiPopover's `compact` mode.
 */
export const CaptionEditorWithPreview = forwardRef<CaptionEditorHandle, CaptionEditorWithPreviewProps>(
  function CaptionEditorWithPreview(
    { value, onChange, placeholder = "What's happening in your pet world?", selectedBackgroundStyle, isDisabled = false },
    ref
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
      const el = textareaRef.current;
      if (!el) return;
      // Reset to 'auto' first so scrollHeight reflects the content's true
      // natural height, not whatever height was set on the previous call.
      el.style.height = 'auto';
      const maxHeight = hasBackground ? MAX_EDITOR_HEIGHT_WITH_BACKGROUND : MAX_EDITOR_HEIGHT;
      const { height, overflowY } = computeAutoGrowHeight(el.scrollHeight, maxHeight);
      el.style.height = `${height}px`;
      // Own the overflow decision here, imperatively, on every call — a
      // static `overflow: 'hidden'` in the JSX style prop below would
      // silently re-clip content the moment it exceeds maxHeight, which is
      // exactly what made long captions unscrollable before this fix.
      el.style.overflowY = overflowY;
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    };

    useEffect(() => {
      adjustHeight();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, selectedBackgroundStyle]);

    const insertAtCursor = (text: string) => {
      const el = textareaRef.current;
      if (!el) {
        onChange(value + text);
        return;
      }
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const next = value.slice(0, start) + text + value.slice(end);
      onChange(next);
      // Restore focus + caret after the inserted text on the next tick,
      // once the controlled value has actually re-rendered into the DOM.
      requestAnimationFrame(() => {
        el.focus();
        const caret = start + text.length;
        el.setSelectionRange(caret, caret);
      });
    };

    useImperativeHandle(ref, () => ({ insertAtCursor }));

    const hasBackground = Boolean(selectedBackgroundStyle);
    const bgStyle: React.CSSProperties = hasBackground
      ? {
          background:
            selectedBackgroundStyle?.styleType === 'gradient' && selectedBackgroundStyle.colorValueEnd
              ? `linear-gradient(135deg, ${selectedBackgroundStyle.colorValue}, ${selectedBackgroundStyle.colorValueEnd})`
              : selectedBackgroundStyle?.colorValue || '#f3f4f6',
        }
      : {};
    const textColor = hasBackground ? selectedBackgroundStyle?.textColor || '#000000' : undefined;

    return (
      <div
        className={
          hasBackground
            ? 'relative rounded-2xl p-6 flex items-center justify-center min-h-[140px] transition-colors'
            : // Light border, soft rounded corners, clean background, gentle
              // focus-within ring — a proper modern text field, never a
              // heavy/dark rigid form control.
              'relative rounded-2xl border border-gray-200 bg-white px-4 py-3.5 transition-colors focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100'
        }
        style={bgStyle}
      >
        <textarea
          ref={textareaRef}
          aria-label="Post caption"
          value={value}
          onChange={handleInput}
          placeholder={placeholder}
          rows={1}
          className={
            hasBackground
              ? 'w-full bg-transparent resize-none outline-none placeholder-black/40 text-xl font-semibold text-center focus:ring-0 pr-9'
              : 'w-full bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400 text-base focus:ring-0 min-h-[52px] pr-9 pb-7'
          }
          disabled={isDisabled}
          style={{ color: textColor }}
        />

        {/* Emoji lives inside the editor's own corner — never in the Quick
            Picks row or a separate bottom toolbar. */}
        <div className="absolute bottom-2.5 right-2.5">
          <EmojiPopover compact onSelect={insertAtCursor} disabled={isDisabled} />
        </div>
      </div>
    );
  }
);
