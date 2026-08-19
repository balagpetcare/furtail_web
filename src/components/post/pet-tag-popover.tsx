'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PawPrint, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SELECTOR_TRIGGER_CLASS, SelectorTriggerContent } from '@/components/ui/popover-picker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getMediaUrl } from '@/lib/media';
import { summarizeMultiSelectLabel } from '@/lib/selector-display';
import type { Pet } from '@/lib/api/pets';

interface PetTagPopoverProps {
  pets: Pet[];
  selectedPetIds: number[];
  onToggle: (petId: number) => void;
  disabled?: boolean;
}

/** Tag Pet quick pick — searchable multi-select popup showing the
 * authenticated user's actual pet registry (photo, name, species/breed),
 * per COMMAND 02 §9. Custom (not PopoverPicker) because pets need avatar
 * images and a species/breed subtitle that the generic taxonomy picker
 * shape doesn't carry. */
export function PetTagPopover({ pets, selectedPetIds, onToggle, disabled = false }: PetTagPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const filtered = pets.filter((pet) => {
    const q = search.toLowerCase();
    return (
      pet.name.toLowerCase().includes(q) ||
      pet.species?.toLowerCase().includes(q) ||
      pet.breed?.toLowerCase().includes(q)
    );
  });

  const selectedPets = pets.filter((pet) => selectedPetIds.includes(Number(pet.id)));
  const display = summarizeMultiSelectLabel(
    selectedPets.map((pet) => ({ label: pet.name })),
    'Pet',
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger disabled={disabled} className={SELECTOR_TRIGGER_CLASS} aria-label="Tag Pet">
        <SelectorTriggerContent icon={<PawPrint className="w-3.5 h-3.5" />} label={display.label} />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <div className="space-y-2 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search your pets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              {search ? `No pets match "${search}"` : 'No pets found'}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filtered.map((pet) => {
                const petIdNum = Number(pet.id);
                const selected = selectedPetIds.includes(petIdNum);
                return (
                  <button
                    key={pet.id}
                    onClick={() => onToggle(petIdNum)}
                    aria-pressed={selected}
                    className={`w-full text-left px-2 py-2 rounded-lg transition-colors text-sm flex items-center gap-2.5 ${
                      selected ? 'bg-purple-50 text-purple-900' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={getMediaUrl(pet.avatarUrl)} alt={pet.name} />
                      <AvatarFallback className="bg-purple-100 text-purple-700 text-xs font-semibold">
                        {pet.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{pet.name}</div>
                      {(pet.species || pet.breed) && (
                        <div className="text-xs text-gray-500 truncate">
                          {[pet.species, pet.breed].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {}}
                      className="w-4 h-4 flex-shrink-0"
                      tabIndex={-1}
                    />
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-1 flex justify-end border-t border-gray-100">
            <button
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-purple-600 hover:text-purple-800 px-2 py-1"
            >
              Done
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
