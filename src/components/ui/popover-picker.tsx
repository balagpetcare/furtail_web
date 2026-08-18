'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check } from 'lucide-react';
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

interface PopoverPickerBaseProps {
  options: PickerOption[] | null;
  isLoading: boolean;
  error?: string;
  onRetry?: () => void;
  placeholder?: string;
  searchPlaceholder?: string;
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
  showEmoji?: boolean;
  className?: string;
  disabled?: boolean;
}

interface SingleSelectProps extends PopoverPickerBaseProps {
  multiSelect?: false;
  onSelect: (option: PickerOption) => void;
  selectedKeys?: never;
  onToggle?: never;
}

interface MultiSelectProps extends PopoverPickerBaseProps {
  multiSelect: true;
  /** Keys of currently-selected options — checked/highlighted in the list. */
  selectedKeys: string[];
  /** Called for every click; popover stays open so more than one item can
   * be picked in one visit. */
  onToggle: (option: PickerOption) => void;
  onSelect?: never;
}

type PopoverPickerProps = SingleSelectProps | MultiSelectProps;

/** Shared compact trigger style used by every Create Post quick pick —
 * horizontally scrollable row, so every trigger must not shrink and must
 * carry its own focus-visible ring (Base UI's Popover doesn't style
 * unfocused triggers). */
export const QUICK_PICK_TRIGGER_CLASS =
  'flex-shrink-0 px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1';

export function PopoverPicker(props: PopoverPickerProps) {
  const {
    options,
    isLoading,
    error,
    onRetry,
    placeholder = 'Select an option',
    searchPlaceholder = 'Search...',
    triggerLabel,
    triggerIcon,
    showEmoji = true,
    className = '',
    disabled = false,
  } = props;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    if (!options) return [];
    const lowercaseSearch = search.toLowerCase();
    return options.filter(
      option =>
        option.label.toLowerCase().includes(lowercaseSearch) ||
        option.key.toLowerCase().includes(lowercaseSearch)
    );
  }, [search, options]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const handleClick = (option: PickerOption) => {
    if (props.multiSelect) {
      props.onToggle(option);
      return;
    }
    props.onSelect(option);
    setSearch('');
    setOpen(false);
  };

  const isSelected = (option: PickerOption): boolean =>
    props.multiSelect ? props.selectedKeys.includes(option.key) : false;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled || isLoading}
        className={`${QUICK_PICK_TRIGGER_CLASS} ${className}`}
        aria-label={triggerLabel}
      >
        {triggerIcon}
        <span>{triggerLabel}</span>
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
              No results for &quot;{search}&quot;
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filtered.map((option) => {
                const selected = isSelected(option);
                return (
                  <button
                    key={`${option.key}-${option.id}`}
                    onClick={() => handleClick(option)}
                    aria-pressed={props.multiSelect ? selected : undefined}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 ${
                      selected ? 'bg-purple-50 text-purple-900' : 'hover:bg-gray-100'
                    }`}
                  >
                    {showEmoji && option.emoji && <span className="text-base">{option.emoji}</span>}
                    <span className="flex-1">{option.label}</span>
                    {option.category && <span className="text-xs text-gray-400">{option.category}</span>}
                    {selected && <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {props.multiSelect && (
            <div className="pt-1 flex justify-end border-t border-gray-100">
              <button
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-purple-600 hover:text-purple-800 px-2 py-1"
              >
                Done
              </button>
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
        className="ml-1 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-full"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
