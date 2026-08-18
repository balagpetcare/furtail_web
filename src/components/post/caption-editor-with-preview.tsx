'use client';

import React, { useRef, useEffect } from 'react';
import { TaxonomyOption } from '@/lib/api/taxonomies';

interface CaptionEditorWithPreviewProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  selectedBackgroundStyle?: TaxonomyOption | null;
  isDisabled?: boolean;
}

export function CaptionEditorWithPreview({
  value,
  onChange,
  placeholder = "What's happening in your pet world?",
  selectedBackgroundStyle,
  isDisabled = false,
}: CaptionEditorWithPreviewProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    adjustHeight();
  };

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  // Determine background and text colors
  const bgColor = selectedBackgroundStyle?.colorValue || '#f3f4f6';
  const textColor = selectedBackgroundStyle?.textColor || '#1f2937'; // Admin-managed safe text color
  const showPreview = selectedBackgroundStyle && value.trim().length > 0;

  return (
    <div className="space-y-2">
      {/* Live Preview (if background selected and text exists) */}
      {showPreview && (
        <div
          className="p-4 rounded-lg min-h-[100px] flex items-center justify-center text-center break-words whitespace-pre-wrap text-sm leading-relaxed"
          style={{
            backgroundColor: bgColor,
            color: textColor,
          }}
        >
          {value}
        </div>
      )}

      {/* Caption Editor */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        placeholder={placeholder}
        rows={1}
        className="w-full bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400 text-base focus:ring-0 min-h-[52px]"
        disabled={isDisabled}
        style={{ overflow: 'hidden', height: 'auto' }}
      />
    </div>
  );
}
