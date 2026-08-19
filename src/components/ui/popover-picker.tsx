'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { computeSingleSelectDisplay, summarizeMultiSelectLabel } from '@/lib/selector-display';

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
  /** Placeholder label shown on the trigger when nothing is selected. */
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
  showEmoji?: boolean;
  className?: string;
  disabled?: boolean;
}

interface SingleSelectProps extends PopoverPickerBaseProps {
  multiSelect?: false;
  /** Currently selected option's key, if any — the trigger relabels
   * itself to that option instead of showing a separate removable chip. */
  selectedKey?: string | null;
  /** Explicit label override, used when the draft already has a cached
   * label (e.g. Category) that may not match the loaded options list by
   * key casing, or before the options list has finished loading. Takes
   * precedence over looking `selectedKey` up in `options`. */
  selectedLabel?: string | null;
  onSelect: (option: PickerOption) => void;
  /** Renders a "Clear <label>" row inside the popover when something is
   * selected. Omit to not offer clearing from this picker. */
  onClear?: () => void;
  clearLabel?: string;
  selectedKeys?: never;
  onToggle?: never;
}

interface MultiSelectProps extends PopoverPickerBaseProps {
  multiSelect: true;
  /** Keys of currently-selected options — checked/highlighted in the list,
   * and summarized on the trigger ("Dogs", "Dogs +2"). */
  selectedKeys: string[];
  /** Called for every click; popover stays open so more than one item can
   * be picked in one visit. Toggling an already-selected item off is how
   * individual removal happens — no separate chip/× needed. */
  onToggle: (option: PickerOption) => void;
  onSelect?: never;
}

type PopoverPickerProps = SingleSelectProps | MultiSelectProps;

/** Shared compact trigger style for every Create Post metadata selector
 * (Post Type, Feeling, Activity, Pet, Location, Category, Tags) — same
 * visual family as the Public/privacy selector: subtle gray pill, compact
 * height, small icon + chevron. Not used by Photo/Video (see
 * QUICK_PICK_TRIGGER_CLASS below), which stay their own distinct action
 * buttons. */
export const SELECTOR_TRIGGER_CLASS =
  'flex-shrink-0 inline-flex items-center gap-1.5 h-8 max-w-[190px] px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1';

/** Shared closed-trigger content (icon + truncated label + chevron) so
 * every selector — whether built on PopoverPicker or a domain-specific
 * popup like PetTagPopover/LocationPopover — renders an identical trigger
 * shape. Long labels truncate with a native tooltip via `title`. */
export function SelectorTriggerContent({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <>
      {icon}
      <span className="truncate" title={label}>
        {label}
      </span>
      <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
    </>
  );
}

/** Backwards-compatible alias — Photo/Video action buttons in
 * create-post-modal.tsx use this exact class and are NOT part of the
 * metadata-selector unification (they're upload actions, not a value
 * picker), so it stays separate from SELECTOR_TRIGGER_CLASS. */
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
    props.multiSelect ? props.selectedKeys.includes(option.key) : props.selectedKey === option.key;

  const display = props.multiSelect
    ? summarizeMultiSelectLabel(
        (options || []).filter((option) => props.selectedKeys.includes(option.key)),
        triggerLabel,
      )
    : computeSingleSelectDisplay(options, props.selectedKey, props.selectedLabel, triggerLabel);

  const canClear = !props.multiSelect && Boolean(props.onClear) && display.selected;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled || isLoading}
        className={`${SELECTOR_TRIGGER_CLASS} ${className}`}
        aria-label={triggerLabel}
      >
        <SelectorTriggerContent icon={triggerIcon} label={display.label} />
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

          {canClear && !props.multiSelect && (
            <button
              onClick={() => {
                props.onClear!();
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 flex items-center gap-2 border-b border-gray-100"
            >
              <X className="w-3.5 h-3.5" />
              {props.clearLabel || `Clear ${triggerLabel}`}
            </button>
          )}

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
                    aria-pressed={selected}
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
