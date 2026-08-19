'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface SelectorOptionRowProps {
  /** Left-side visual identity for this option — an emoji string, a Lucide
   * icon element, a Pet avatar, or any other small React node. Domain
   * components decide what goes here; this component only lays it out. */
  leading?: React.ReactNode;
  label: string;
  /** Secondary line under the label (e.g. a Pet's species/breed). */
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  /** Overrides the default "show a Check icon when selected" trailing
   * slot — used by PetTagPopover, which shows a checkbox instead. */
  trailing?: React.ReactNode;
}

/** Shared open-popup option row for every Create Post metadata selector
 * (Feeling/Activity/Pet/Location/Category/Tags) — guarantees every row has
 * its visual identity on the left, consistent selected styling, and
 * consistent selected-state affordance on the right, without dictating
 * what that leading visual actually is (domain logic stays in each
 * picker). */
export function SelectorOptionRow({
  leading,
  label,
  description,
  selected = false,
  disabled = false,
  onSelect,
  trailing,
}: SelectorOptionRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors text-sm flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed ${
        selected ? 'bg-purple-50 text-purple-900' : 'hover:bg-gray-100'
      }`}
    >
      {/* No fixed size here — a lucide icon or emoji sizes itself via its
          own className, and a Pet avatar (larger, ~32px) needs to render
          at its natural size rather than being clipped by a shared box. */}
      {leading !== undefined && <span className="flex-shrink-0">{leading}</span>}
      <span className="flex-1 min-w-0">
        <span className="block truncate">{label}</span>
        {description && <span className="block truncate text-xs text-gray-500">{description}</span>}
      </span>
      {trailing !== undefined ? trailing : selected && <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />}
    </button>
  );
}
