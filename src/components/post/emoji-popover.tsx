'use client';

import React, { useState } from 'react';
import { Smile } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { QUICK_PICK_TRIGGER_CLASS } from '@/components/ui/popover-picker';

const EMOJI_FAVORITES = [
  '😊', '😂', '😍', '😢', '😡', '😴', '🤔', '🎉', '🎊', '💕',
  '🔥', '👍', '👏', '🙌', '✨', '⭐', '🌟', '💯', '🤗', '😎',
];

interface EmojiPopoverProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  /** Compact mode renders an icon-only round button for embedding inside
   * the caption editor's own corner, instead of the labeled Quick Pick
   * chip style. The picker opens upward since the trigger sits at the
   * bottom of the editor. */
  compact?: boolean;
}

export function EmojiPopover({ onSelect, disabled = false, compact = false }: EmojiPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={
          compact
            // Semi-transparent white pill so the icon stays legible whether
            // the editor is in its default white state or showing a
            // colorful/dark selected background style underneath it.
            ? 'w-8 h-8 flex items-center justify-center rounded-full bg-white/70 hover:bg-white/90 text-gray-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500'
            : QUICK_PICK_TRIGGER_CLASS
        }
        aria-label="Add emoji"
      >
        <Smile className={compact ? 'w-[18px] h-[18px]' : 'w-3.5 h-3.5'} />
        {!compact && <span>Emoji</span>}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" side={compact ? 'top' : 'bottom'} align="end">
        <div className="grid grid-cols-5 gap-2">
          {EMOJI_FAVORITES.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg text-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              aria-label={`Insert emoji ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
