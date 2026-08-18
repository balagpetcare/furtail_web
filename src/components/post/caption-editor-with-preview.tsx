'use client';

import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { TaxonomyOption } from '@/lib/api/taxonomies';

interface CaptionEditorWithPreviewProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  selectedBackgroundStyle?: TaxonomyOption | null;
  isDisabled?: boolean;
}

export interface CaptionEditorHandle {
  /** Inserts text at the current cursor position (replacing any selection)
   * and restores focus/caret — used by the Emoji quick pick so emoji land
   * where the user was typing instead of always at the end. */
  insertAtCursor: (text: string) => void;
}

/**
 * The editing surface IS the background preview when a style is selected —
 * one element, not a duplicate read-only box stacked above a separate
 * plain textarea. Matches mainstream text-background composers (COMMAND 02
 * §21/§22) while staying auto-growing and compact when empty/short.
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
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, hasBackground ? 260 : 200) + 'px';
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    };

    useEffect(() => {
      adjustHeight();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, selectedBackgroundStyle]);

    useImperativeHandle(ref, () => ({
      insertAtCursor: (text: string) => {
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
      },
    }));

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
            ? 'rounded-xl p-6 flex items-center justify-center min-h-[140px] transition-colors'
            : ''
        }
        style={bgStyle}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          placeholder={placeholder}
          rows={1}
          className={
            hasBackground
              ? 'w-full bg-transparent resize-none outline-none placeholder-black/40 text-xl font-semibold text-center focus:ring-0'
              : 'w-full bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400 text-base focus:ring-0 min-h-[52px]'
          }
          disabled={isDisabled}
          style={{ overflow: 'hidden', height: 'auto', color: textColor }}
        />
      </div>
    );
  }
);
