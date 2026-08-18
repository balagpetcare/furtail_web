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
}

export function EmojiPopover({ onSelect, disabled = false }: EmojiPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger disabled={disabled} className={QUICK_PICK_TRIGGER_CLASS} aria-label="Emoji">
        <Smile className="w-3.5 h-3.5" />
        <span>Emoji</span>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3">
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
