'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SELECTOR_TRIGGER_CLASS, SelectorTriggerContent } from '@/components/ui/popover-picker';

interface LocationPopoverProps {
  value?: string;
  onSave: (locationText: string) => void;
  disabled?: boolean;
}

/** Location quick pick — small popup with a text input + Save, replacing
 * the previous permanent full-width "Add location" field per COMMAND 02
 * §10. Only the resulting chip stays visible in the composer body. */
export function LocationPopover({ value, onSave, disabled = false }: LocationPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus is a DOM side effect (not React state), so this stays a
  // legitimate effect — only the `draft` reset moved into onOpenChange
  // below, since setting state synchronously inside an effect body
  // triggers an avoidable extra render.
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  const handleSave = () => {
    onSave(draft.trim());
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value || '');
        setOpen(next);
      }}
    >
      <PopoverTrigger disabled={disabled} className={SELECTOR_TRIGGER_CLASS} aria-label="Location">
        <SelectorTriggerContent icon={<MapPin className="w-3.5 h-3.5" />} label={value || 'Location'} />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <label htmlFor="post-location-input" className="text-xs font-medium text-gray-600">
            Location
          </label>
          <input
            id="post-location-input"
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
            }}
            placeholder="e.g. Dhaka, Bangladesh"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
          />
          <div className="flex items-center justify-between gap-2 pt-1">
            {value ? (
              <button
                type="button"
                onClick={() => {
                  onSave('');
                  setOpen(false);
                }}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1.5"
              >
                Clear Location
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-full px-3 py-1.5 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
