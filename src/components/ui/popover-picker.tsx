'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface PickerOption {
  id: number;
  key: string;
  label: string;
  emoji?: string;
  category?: string;
  colorValue?: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface PopoverPickerProps {
  options: PickerOption[] | null;
  isLoading: boolean;
  error?: string;
  onRetry?: () => void;
  onSelect: (option: PickerOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
  showEmoji?: boolean;
  className?: string;
  disabled?: boolean;
}

export function PopoverPicker({
  options,
  isLoading,
  error,
  onRetry,
  onSelect,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  triggerLabel,
  triggerIcon,
  showEmoji = true,
  className = '',
  disabled = false,
}: PopoverPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState<PickerOption[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!options) {
      setFiltered([]);
      return;
    }

    const lowercaseSearch = search.toLowerCase();
    const filtered = options.filter(
      option =>
        option.label.toLowerCase().includes(lowercaseSearch) ||
        option.key.toLowerCase().includes(lowercaseSearch)
    );
    setFiltered(filtered);
  }, [search, options]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (option: PickerOption) => {
    onSelect(option);
    setSearch('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled || isLoading}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
        >
          {triggerIcon}
          {triggerLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <div className="space-y-2 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isLoading && (
            <div className="py-6 text-center text-sm text-gray-500">
              Loading options...
            </div>
          )}

          {error && (
            <div className="py-4 space-y-2 text-center">
              <p className="text-sm text-red-600">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {!isLoading && !error && filtered.length === 0 && options && options.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-500">
              {placeholder}
            </div>
          )}

          {!isLoading && !error && filtered.length === 0 && search && (
            <div className="py-6 text-center text-sm text-gray-500">
              No results for "{search}"
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filtered.map((option) => (
                <button
                  key={`${option.key}-${option.id}`}
                  onClick={() => handleSelect(option)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm flex items-center gap-2"
                >
                  {showEmoji && option.emoji && <span className="text-base">{option.emoji}</span>}
                  <span className="flex-1">{option.label}</span>
                  {option.category && <span className="text-xs text-gray-400">{option.category}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface SelectedChipProps {
  label: string;
  emoji?: string;
  onRemove: () => void;
}

export function SelectedChip({ label, emoji, onRemove }: SelectedChipProps) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-sm">
      {emoji && <span className="text-base">{emoji}</span>}
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="ml-1 hover:text-gray-600"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
