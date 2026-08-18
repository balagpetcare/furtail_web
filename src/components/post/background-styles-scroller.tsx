'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Ban } from 'lucide-react';
import { TaxonomyOption } from '@/lib/api/taxonomies';

interface BackgroundStylesScrollerProps {
  styles: TaxonomyOption[] | null;
  isLoading: boolean;
  selected?: string;
  onSelect: (styleKey: string) => void;
}

/**
 * Single horizontal row of small swatches — no "Background" heading/label,
 * no wrapping, no second row (COMMAND 02 §17/§18). Every style comes from
 * the database-backed useBackgroundStyles() query; nothing here is
 * hardcoded, so an admin-added/disabled/reordered style shows up on
 * refetch without a Web deploy.
 */
export function BackgroundStylesScroller({
  styles,
  isLoading,
  selected,
  onSelect,
}: BackgroundStylesScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollBy({
        left: direction === 'left' ? -160 : 160,
        behavior: 'smooth',
      });
    }
  };

  if (isLoading || !styles || styles.length === 0) {
    return null;
  }

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={() => scroll('left')}
        className="flex-shrink-0 z-10 bg-white rounded-full p-1 shadow-sm hover:shadow-md transition-shadow mr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        aria-label="Scroll backgrounds left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div
        ref={scrollerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        {styles.map((style) => {
          const isNone = !style.colorValue;
          const isSelected = selected === style.key;
          const background =
            style.styleType === 'gradient' && style.colorValueEnd
              ? `linear-gradient(135deg, ${style.colorValue}, ${style.colorValueEnd})`
              : style.colorValue || undefined;
          const accessibleName = isNone
            ? `No background${isSelected ? ' (selected)' : ''}`
            : `${style.label} background${isSelected ? ' (selected)' : ''}`;

          return (
            <button
              key={style.key}
              type="button"
              onClick={() => onSelect(style.key)}
              className={`flex-shrink-0 w-9 h-9 rounded-full transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 ${
                isSelected
                  ? 'ring-2 ring-purple-500 ring-offset-2'
                  : 'border border-gray-300'
              } ${isNone ? 'bg-white' : ''}`}
              style={{ background }}
              title={isNone ? 'No background' : style.label}
              aria-label={accessibleName}
              aria-pressed={isSelected}
            >
              {isNone && <Ban className="w-4 h-4 text-gray-400" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scroll('right')}
        className="flex-shrink-0 z-10 bg-white rounded-full p-1 shadow-sm hover:shadow-md transition-shadow ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        aria-label="Scroll backgrounds right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
