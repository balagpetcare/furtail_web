'use client';

import React, { useRef } from 'react';
import { ImageIcon, Video, Smile, Palette, MoreHorizontal } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MediaActionBarProps {
  onPhotoSelect: (files: FileList | null) => void;
  onVideoSelect: (files: FileList | null) => void;
  onEmojiSelect: (emoji: string) => void;
  onBackgroundClick: () => void;
  isDisabled?: boolean;
  isUploading?: boolean;
}

const EMOJI_FAVORITES = [
  '😊', '😂', '😍', '😢', '😡', '😴', '🤔', '🎉', '🎊', '💕',
  '🔥', '👍', '👏', '🙌', '✨', '⭐', '🌟', '💯', '🤗', '😎',
];

export function MediaActionBar({
  onPhotoSelect,
  onVideoSelect,
  onEmojiSelect,
  onBackgroundClick,
  isDisabled = false,
  isUploading = false,
}: MediaActionBarProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Photo */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onPhotoSelect(e.target.files)}
      />
      <button
        type="button"
        onClick={() => photoInputRef.current?.click()}
        disabled={isDisabled}
        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm text-gray-700"
        aria-label="Add photos"
      >
        <ImageIcon className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">Photo</span>
      </button>

      {/* Video */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => onVideoSelect(e.target.files)}
      />
      <button
        type="button"
        onClick={() => videoInputRef.current?.click()}
        disabled={isDisabled}
        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm text-gray-700"
        aria-label="Add video"
      >
        <Video className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">Video</span>
      </button>

      {/* Emoji Picker */}
      <Popover>
        <PopoverTrigger
          disabled={isDisabled}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm text-gray-700"
          aria-label="Insert emoji"
        >
          <Smile className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Emoji</span>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3">
          <div className="grid grid-cols-5 gap-2">
            {EMOJI_FAVORITES.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onEmojiSelect(emoji);
                  // Close popover handled by parent
                }}
                className="p-2 hover:bg-gray-100 rounded-lg text-2xl transition-colors"
                aria-label={`Select emoji ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Background */}
      <button
        type="button"
        onClick={onBackgroundClick}
        disabled={isDisabled}
        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm text-gray-700"
        aria-label="Select background"
      >
        <Palette className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">Background</span>
      </button>

      {/* More Menu */}
      <Popover>
        <PopoverTrigger
          disabled={isDisabled}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm text-gray-700"
          aria-label="More options"
        >
          <MoreHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">More</span>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <div className="space-y-1">
            <button className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm text-gray-700">
              Tag Pet
            </button>
            <button className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm text-gray-700">
              Location
            </button>
            <button className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm text-gray-700">
              Category
            </button>
            <button className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm text-gray-700">
              Tags
            </button>
            <button className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm text-gray-700">
              Post Type
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Upload Status */}
      {isUploading && (
        <span className="text-[10px] text-gray-500 animate-pulse ml-auto">
          Uploading...
        </span>
      )}
    </div>
  );
}
