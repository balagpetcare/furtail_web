'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TaxonomyOption } from '@/lib/api/taxonomies';

interface BackgroundStylesScrollerProps {
  styles: TaxonomyOption[] | null;
  isLoading: boolean;
  selected?: string;
  onSelect: (styleKey: string) => void;
}

export function BackgroundStylesScroller({
  styles,
  isLoading,
  selected,
  onSelect,
}: BackgroundStylesScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollerRef.current) {
      const scrollAmount = 200;
      scrollerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (isLoading || !styles || styles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-600">Background</label>
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-sm hover:shadow-md transition-shadow"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollerRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-8"
          style={{ scrollBehavior: 'smooth' }}
        >
          {styles.map((style) => (
            <button
              key={style.key}
              onClick={() => onSelect(style.key)}
              className={`flex-shrink-0 w-10 h-10 rounded-lg transition-all ${
                selected === style.key ? 'ring-2 ring-blue-500 ring-offset-2' : 'border border-gray-200'
              }`}
              style={{
                backgroundColor: style.colorValue || '#f3f4f6',
              }}
              title={style.label}
              aria-label={`${style.label} background${selected === style.key ? ' (selected)' : ''}`}
              aria-pressed={selected === style.key}
            />
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-1 shadow-sm hover:shadow-md transition-shadow"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
