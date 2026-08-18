"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, X, Globe, Lock } from "lucide-react";
import { getMediaUrl } from "@/lib/media";
import { authKeys, authApi } from "@/lib/api/auth";
import { postsApi, postsKeys } from "@/lib/api/posts";
import { toast } from "sonner";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UploadedMedia {
  id: number;
  url: string;
}

async function uploadPostMedia(file: File): Promise<UploadedMedia> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", "post");
  const res = await fetch("/api/proxy/media/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Failed to upload media");
  const body = await res.json();
  return body.data as UploadedMedia;
}

export function CreatePostModal({ open, onOpenChange }: CreatePostModalProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  // Owns the Create Post idempotency key for the current draft: generated
  // lazily on first submit, reused across retries of that same draft
  // (deliberately not cleared on error), and reset only when a post
  // actually succeeds or the composer is reopened for a new draft — a
  // genuinely new post gets a new key, a retry of the same one does not.
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) idempotencyKeyRef.current = null;
  }, [open]);

  const { data: user } = useQuery({
    queryKey: authKeys.me,
    queryFn: () => authApi.getMe(),
  });

  const mutation = useMutation({
    mutationFn: (caption: string) => {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = crypto.randomUUID();
      }
      return postsApi.createPost({
        caption,
        mediaIds: attachments.length ? attachments.map((a) => a.id) : undefined,
        idempotencyKey: idempotencyKeyRef.current,
      });
    },
    onSuccess: () => {
      idempotencyKeyRef.current = null;
      setContent("");
      setAttachments([]);
      onOpenChange(false);
      toast.success("Post created successfully!");
      queryClient.invalidateQueries({ queryKey: postsKeys.all });
    },
    onError: () => {
      // Deliberately do not clear idempotencyKeyRef — a user-triggered
      // retry of this same draft must reuse the same key.
      toast.error("Failed to create post. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && attachments.length === 0) || mutation.isPending) return;
    mutation.mutate(content);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const media = await uploadPostMedia(file);
      setAttachments((prev) => [...prev, media]);
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const displayName = user?.profile.displayName;
  const avatarUrl = user?.profile.avatarMedia?.url ?? null;
  const fallbackInitial = displayName ? displayName.charAt(0).toUpperCase() : "U";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl p-5 bg-white border border-gray-100 shadow-xl">
        <DialogHeader className="border-b border-gray-50 pb-3">
          <DialogTitle className="text-center text-base font-bold text-gray-950">Create post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border border-gray-100">
              <AvatarImage src={getMediaUrl(avatarUrl)} alt="Avatar" />
              <AvatarFallback className="bg-purple-50 text-purple-700 font-semibold">{fallbackInitial}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm text-gray-900 leading-tight">{displayName || "Furtail Member"}</p>
              {/* Audience Selector Mockup */}
              <div className="flex items-center gap-1 mt-1 bg-gray-100 hover:bg-gray-200/80 px-2 py-0.5 rounded-full text-[11px] text-gray-600 font-medium select-none cursor-pointer w-fit">
                <Globe className="w-3 h-3 text-gray-500" />
                <span>Public</span>
              </div>
            </div>
          </div>

          {/* Text Area */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={5}
            className="w-full bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400 text-[15px] focus:ring-0"
            disabled={mutation.isPending}
          />

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="flex gap-2 flex-wrap max-h-40 overflow-y-auto p-1 bg-gray-50/50 rounded-xl border border-gray-100">
              {attachments.map((media) => (
                <div key={media.id} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 group">
                  <img src={getMediaUrl(media.url)} alt="Attachment" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((m) => m.id !== media.id))}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex items-center justify-between border border-gray-100 rounded-xl p-3 bg-gray-50/30">
            <span className="text-xs text-gray-500 font-semibold pl-1">Add to your post</span>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || mutation.isPending}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-full h-8 w-8 cursor-pointer"
              >
                <ImageIcon className="w-4.5 h-4.5" />
              </Button>
              {uploading && (
                <span className="text-[10px] text-gray-400 animate-pulse">Uploading...</span>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={(!content.trim() && attachments.length === 0) || mutation.isPending}
            className="w-full rounded-full h-10 font-bold bg-purple-600 hover:bg-purple-700 active:scale-99 transition-all text-white disabled:opacity-50 cursor-pointer"
          >
            {mutation.isPending ? "Posting..." : "Post"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
