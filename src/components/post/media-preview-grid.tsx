'use client';

import React from 'react';
import { X, Loader, RotateCcw } from 'lucide-react';
import { MediaItem } from '@/lib/create-post-draft';
import { getMediaUrl } from '@/lib/media';

interface MediaPreviewGridProps {
  media: MediaItem[];
  onRemove: (id: number) => void;
  onRetry: (id: number) => void;
}

export function MediaPreviewGrid({ media, onRemove, onRetry }: MediaPreviewGridProps) {
  if (media.length === 0) return null;

  const getGridClass = () => {
    switch (media.length) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-3';
      case 4:
        return 'grid-cols-2 sm:grid-cols-4';
      default:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
    }
  };

  return (
    <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className={`grid ${getGridClass()} gap-2`}>
        {media.map((item) => (
          <div
            key={item.id}
            className="relative rounded-lg overflow-hidden bg-gray-200 aspect-square group"
          >
            {/* Media Preview */}
            {item.type === 'VIDEO' ? (
              <video
                src={getMediaUrl(item.url)}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={getMediaUrl(item.url)}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            )}

            {/* Uploading State */}
            {(item.status === 'LOCAL' || item.status === 'UPLOADING') && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                <Loader className="w-5 h-5 text-white animate-spin" />
                <span className="text-xs text-white font-medium">
                  {item.status === 'LOCAL' ? 'Queued' : 'Uploading'}
                </span>
              </div>
            )}

            {/* Failed State */}
            {item.status === 'FAILED' && (
              <div className="absolute inset-0 bg-red-500/70 flex flex-col items-center justify-center gap-2 p-2">
                <X className="w-5 h-5 text-white" />
                <span className="text-[10px] text-white font-medium text-center">Failed</span>
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={() => onRetry(item.id)}
                    className="text-[9px] bg-white/30 hover:bg-white/50 text-white px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
                    aria-label="Retry upload"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Retry
                  </button>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="text-[9px] bg-red-900/50 hover:bg-red-900/70 text-white px-1.5 py-0.5 rounded transition-colors"
                    aria-label="Remove failed media"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Remove Button for Ready/Uploading */}
            {item.status !== 'FAILED' && item.status !== 'LOCAL' && (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove media"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Media Type Badge */}
            {item.status === 'READY' && (
              <div className="absolute bottom-1 right-1 text-xs text-white bg-black/60 px-1.5 py-0.5 rounded">
                {item.type === 'VIDEO' ? 'Video' : 'Image'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
