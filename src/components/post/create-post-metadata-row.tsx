'use client';

import React from 'react';
import { FileText, SmileIcon, Zap, PawPrint, MapPin, Grid3x3, Hash } from 'lucide-react';
import { CreatePostDraft } from '@/lib/create-post-draft';

interface MetadataRowProps {
  draft: CreatePostDraft;
}

export function CreatePostMetadataRow({ draft }: MetadataRowProps) {
  const postTypeLabel = draft.postType === 'GENERAL'
    ? 'General'
    : draft.postType?.replace(/_/g, ' ') || 'General';

  return (
    <div className="flex gap-1.5 flex-wrap mb-4 items-center">
      <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Quick picks:</div>

      {/* Post Type - display only */}
      <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-gray-300 bg-gray-50 flex items-center gap-1 cursor-default">
        <FileText className="w-3.5 h-3.5" />
        <span>{postTypeLabel}</span>
      </span>

      {/* Feeling - display only */}
      <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-gray-300 bg-gray-50 flex items-center gap-1 cursor-default">
        <SmileIcon className="w-3.5 h-3.5" />
        <span>{draft.feelingEmoji || '😊'} {draft.feelingLabel || 'Feeling'}</span>
      </span>

      {/* Activity - display only */}
      <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-gray-300 bg-gray-50 flex items-center gap-1 cursor-default">
        <Zap className="w-3.5 h-3.5" />
        <span>{draft.activityEmoji || '⚡'} {draft.activityLabel || 'Activity'}</span>
      </span>
    </div>
  );
}
