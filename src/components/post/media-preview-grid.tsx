'use client';

import React from 'react';
import { X, Loader, RotateCcw, Plus } from 'lucide-react';
import { MediaItem } from '@/lib/create-post-draft';
import { getMediaUrl } from '@/lib/media';

interface MediaPreviewGridProps {
  media: MediaItem[];
  onRemove: (clientId: number) => void;
  onRetry: (clientId: number) => void;
  /** Renders a small "+" tile after the last item so users can add more
   * media without a footer toolbar (COMMAND 02 §25 option B). Omit to hide. */
  onAddMore?: () => void;
  addMoreDisabled?: boolean;
}

export function MediaPreviewGrid({ media, onRemove, onRetry, onAddMore, addMoreDisabled }: MediaPreviewGridProps) {
  if (media.length === 0) return null;

  const tileCount = media.length + (onAddMore ? 1 : 0);
  const getGridClass = () => {
    switch (tileCount) {
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
        {media.map((item) => {
          const radius = 20;
          const strokeWidth = 3;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - ((item.progress || 0) / 100) * circumference;

          return (
            <div
              key={item.clientId}
              className="relative rounded-lg overflow-hidden bg-gray-200 aspect-square group"
            >
              {/* Media Preview */}
              {item.type === 'VIDEO' && (item.status === 'PLAYABLE' || item.status === 'READY') ? (
                <video
                  src={getMediaUrl(item.hlsUrl || item.previewUrl)}
                  className="w-full h-full object-cover"
                  preload="metadata"
                  controls
                />
              ) : item.type === 'VIDEO' ? (
                item.localThumbnailUrl || item.thumbnailUrl ? (
                  <img
                    src={getMediaUrl(item.localThumbnailUrl || item.thumbnailUrl || '')}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={getMediaUrl(item.previewUrl)}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                )
              ) : (
                <img
                  src={getMediaUrl(item.previewUrl)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              )}

              {/* LOCAL (Preparing) State */}
              {item.status === 'LOCAL' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1.5 p-2 text-white">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span className="text-xs font-medium">Preparing...</span>
                </div>
              )}

              {/* UPLOADING State */}
              {item.status === 'UPLOADING' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-2 text-white">
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    <svg className="w-14 h-14 transform -rotate-90">
                      <circle
                        className="text-white/20"
                        strokeWidth={strokeWidth}
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="28"
                        cy="28"
                      />
                      <circle
                        className="text-white transition-all duration-150"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="28"
                        cy="28"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold">{item.progress || 0}%</span>
                  </div>
                  <span className="text-[10px] font-medium mt-1">Uploading...</span>
                </div>
              )}

              {/* PROCESSING State */}
              {item.status === 'PROCESSING' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1.5 p-2 text-white">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span className="text-xs font-medium">Processing...</span>
                </div>
              )}

              {/* PLAYABLE State */}
              {item.status === 'PLAYABLE' && (
                <div className="absolute top-1 left-1 bg-green-600/90 text-[10px] text-white px-1.5 py-0.5 rounded font-bold">
                  Playable
                </div>
              )}

              {/* Failed State */}
              {item.status === 'FAILED' && (
                <div className="absolute inset-0 bg-red-950/85 flex flex-col items-center justify-center gap-1 p-2 text-white">
                  <X className="w-5 h-5 text-red-500" />
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {item.serverMediaId ? 'Processing failed' : 'Upload failed'}
                  </span>
                  <div className="flex gap-1 mt-1.5">
                    <button
                      onClick={() => onRetry(item.clientId)}
                      className="text-[9px] bg-white/20 hover:bg-white/35 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
                      aria-label={item.serverMediaId ? 'Retry processing' : 'Retry upload'}
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Retry
                    </button>
                    <button
                      onClick={() => onRemove(item.clientId)}
                      className="text-[9px] bg-red-600 hover:bg-red-700 px-1.5 py-0.5 rounded transition-colors"
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
                  onClick={() => onRemove(item.clientId)}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove media"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Media Type Badge */}
              {(item.status === 'READY' || item.status === 'PLAYABLE') && (
                <div className="absolute bottom-1 right-1 text-xs text-white bg-black/60 px-1.5 py-0.5 rounded">
                  {item.type === 'VIDEO' ? 'Video' : 'Image'}
                </div>
              )}
            </div>
          );
        })}

        {onAddMore && (
          <button
            type="button"
            onClick={onAddMore}
            disabled={addMoreDisabled}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            aria-label="Add more media"
          >
            <Plus className="w-6 h-6 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}
