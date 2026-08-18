"use client";

import React, { useState } from "react";
import { MoreHorizontal, Bookmark, Edit2, Trash2, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportDialog } from "@/components/social/report-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Shared three-dot post menu (save/edit/delete for the owner, report for
 * everyone else) plus its delete-confirmation dialog — used by the Single
 * Post page and the Comment modal.
 */
export function PostOptionsMenu({
  postId,
  isOwner,
  isBookmarked,
  onToggleBookmark,
  onEdit,
  onDelete,
}: {
  postId: number;
  isOwner: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <div className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full h-8 w-8 flex items-center justify-center cursor-pointer transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl border border-gray-100 shadow-lg">
          <DropdownMenuItem onClick={onToggleBookmark} className="cursor-pointer gap-2 py-2 text-sm text-gray-700">
            <Bookmark className={cn("w-4 h-4 text-gray-500", isBookmarked ? "fill-purple-600 text-purple-600 border-none" : "")} />
            {isBookmarked ? "Remove from saved" : "Save post"}
          </DropdownMenuItem>
          {isOwner && (
            <>
              <DropdownMenuItem onClick={onEdit} className="cursor-pointer gap-2 py-2 text-sm text-gray-700">
                <Edit2 className="w-4 h-4 text-gray-500" /> Edit post
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmDelete(true)} className="text-red-600 cursor-pointer gap-2 py-2 text-sm">
                <Trash2 className="w-4 h-4" /> Delete post
              </DropdownMenuItem>
            </>
          )}
          {!isOwner && (
            <DropdownMenuItem onClick={() => setReportOpen(true)} className="text-red-600 cursor-pointer gap-2 py-2 text-sm">
              <Flag className="w-4 h-4" /> Report post
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} type="POST" targetId={postId} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-2xl border border-gray-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>This can&apos;t be undone. The post will be removed for everyone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-full">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
