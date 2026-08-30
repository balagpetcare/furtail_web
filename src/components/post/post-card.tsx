"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Heart,
  Share2,
  MoreHorizontal,
  Bookmark,
  Edit2,
  Trash2,
  Flag,
} from "lucide-react";
import { ReactionControl } from "@/components/social/reaction-control";
import { ReactionSummary } from "@/components/social/reaction-summary";
import { PostContextMeta } from "@/components/post/post-context-meta";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { postsApi, postsKeys, type Post } from "@/lib/api/posts";
import { fetchApi } from "@/lib/api-client";
import { getMediaUrl } from "@/lib/media";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { CommentPreview } from "@/components/post/comment-preview";
import { CommentModal } from "@/components/post/comment-modal";
import { cn } from "@/lib/utils";
import { FeedCardShell } from "@/components/feed/feed-card-shell";
import { MediaGrid } from "@/components/feed/media-grid";
import { CaptionText } from "@/components/feed/caption-text";
import { ClickableRegion } from "@/components/feed/clickable-region";

interface PostCardProps {
  post: Post;
}

/**
 * Two distinct, separately-triggered ways to engage with a post from the
 * feed (see docs on the interaction refactor this implements):
 *  - Clicking the post's own content (caption, media/media grid cell,
 *    a +N overflow tile) navigates to the real, shareable Single Post
 *    page (`/post/[id]`) — never a modal.
 *  - Clicking the explicit "Comment" action (or the comment-count/"View
 *    all" link in the preview) opens a lightweight Comment popup
 *    (`CommentModal`) — Home stays the current route.
 * Every other control (Like, Share, menu, avatar/username links, video
 * controls) stops there and never triggers navigation or the modal.
 */
export function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);

  const getSafeDisplayName = (author: Record<string, unknown> | null | undefined) => {
    if (!author) return "Furtail User";
    const name = author.displayName || author.name || author.username;
    if (typeof name === "string") {
      const trimmed = name.trim();
      if (trimmed.length > 0) return trimmed;
    }
    return "Furtail User";
  };

  const safeDisplayName = getSafeDisplayName(post.author);
  const avatarFallback = safeDisplayName.charAt(0).toUpperCase();

  const { data: me } = useQuery({
    queryKey: ["user", "me"],
    queryFn: () => fetchApi<{ id: number }>("/user/me"),
  });
  const isOwner = me?.id === post.author.id;

  const invalidateFeeds = () => {
    queryClient.invalidateQueries({ queryKey: postsKeys.all });
  };

  const reactMutation = useMutation({
    mutationFn: (reaction: string | null) =>
      reaction === null
        ? postsApi.unlikePost(String(post.id))
        : postsApi.reactPost(String(post.id), reaction),
    onMutate: async (newReaction) => {
      await queryClient.cancelQueries({ queryKey: postsKeys.all });
      const previousFeeds = queryClient.getQueriesData({ queryKey: postsKeys.all });
      
      queryClient.setQueriesData({ queryKey: postsKeys.all }, (old: any) => {
        if (!old) return old;
        // This is a naive optimistic update that works for infinite queries (pages)
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.map((p: any) => {
                if (p.id === post.id) {
                  const oldReaction = p.viewerReaction || (p.isLikedByMe ? "LIKE" : null);
                  const newReactionSummary = { ...(p.reactionSummary || {}) };
                  let total = p.totalReactionCount ?? p.likeCount ?? 0;
                  
                  if (oldReaction) {
                    newReactionSummary[oldReaction] = Math.max(0, (newReactionSummary[oldReaction] || 0) - 1);
                    if (newReactionSummary[oldReaction] === 0) delete newReactionSummary[oldReaction];
                    total--;
                  }
                  
                  if (newReaction) {
                    newReactionSummary[newReaction] = (newReactionSummary[newReaction] || 0) + 1;
                    total++;
                  }

                  return {
                    ...p,
                    viewerReaction: newReaction,
                    isLikedByMe: newReaction !== null,
                    reactionSummary: newReactionSummary,
                    totalReactionCount: total,
                  };
                }
                return p;
              })
            }))
          };
        } else if (old.id === post.id) {
          const oldReaction = old.viewerReaction || (old.isLikedByMe ? "LIKE" : null);
          const newReactionSummary = { ...(old.reactionSummary || {}) };
          let total = old.totalReactionCount ?? old.likeCount ?? 0;
          
          if (oldReaction) {
            newReactionSummary[oldReaction] = Math.max(0, (newReactionSummary[oldReaction] || 0) - 1);
            if (newReactionSummary[oldReaction] === 0) delete newReactionSummary[oldReaction];
            total--;
          }
          
          if (newReaction) {
            newReactionSummary[newReaction] = (newReactionSummary[newReaction] || 0) + 1;
            total++;
          }

          return {
            ...old,
            viewerReaction: newReaction,
            isLikedByMe: newReaction !== null,
            reactionSummary: newReactionSummary,
            totalReactionCount: total,
          };
        }
        return old;
      });
      return { previousFeeds };
    },
    onError: (err, newReaction, context) => {
      if (context?.previousFeeds) {
        context.previousFeeds.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error("Failed to update reaction");
    },
    onSettled: invalidateFeeds,
  });

  const bookmarkMutation = useMutation({
    mutationFn: () =>
      post.isBookmarkedByMe
        ? postsApi.unbookmarkPost(String(post.id))
        : postsApi.bookmarkPost(String(post.id)),
    onSuccess: () => {
      invalidateFeeds();
      toast.success(post.isBookmarkedByMe ? "Removed from saved" : "Saved");
    },
    onError: () => toast.error("Failed to update saved posts"),
  });

  const shareMutation = useMutation({
    mutationFn: () => postsApi.sharePost(String(post.id)),
    onSuccess: invalidateFeeds,
    onError: () => toast.error("Failed to share post"),
  });

  const retryMediaMutation = useMutation({
    mutationFn: (mediaId: number | string) => postsApi.retryMediaProcessing(mediaId),
    onSuccess: () => {
      toast.success("Re-processing video…");
      invalidateFeeds();
    },
    onError: () => toast.error("Failed to retry processing"),
  });

  const editMutation = useMutation({
    mutationFn: () => postsApi.editPost(String(post.id), { caption: editCaption }),
    onSuccess: () => {
      setIsEditing(false);
      invalidateFeeds();
      toast.success("Post updated");
    },
    onError: () => toast.error("Failed to update post"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.deletePost(String(post.id)),
    onSuccess: () => {
      invalidateFeeds();
      toast.success("Post deleted");
    },
    onError: () => toast.error("Failed to delete post"),
  });

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.publicId ?? post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
    shareMutation.mutate();
  };

  const openSinglePost = (mediaIndex?: number) => {
    const query = mediaIndex ? `?media=${mediaIndex}` : "";
    router.push(`/post/${post.publicId ?? post.id}${query}`);
  };

  return (
    <FeedCardShell
      avatarUrl={getMediaUrl(post.author.avatarUrl || null)}
      avatarFallback={avatarFallback}
      avatarHref={`/profile/${post.author.userId}`}
      title={safeDisplayName}
      meta={<PostContextMeta post={post} />}
      menu={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full h-8 w-8 flex items-center justify-center cursor-pointer transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border border-gray-100 shadow-lg">
              <DropdownMenuItem onClick={() => bookmarkMutation.mutate()} className="cursor-pointer gap-2 py-2 text-sm text-gray-700">
                <Bookmark className={cn("w-4 h-4 text-gray-500", post.isBookmarkedByMe ? "fill-purple-600 text-purple-600 border-none" : "")} />
                {post.isBookmarkedByMe ? "Remove from saved" : "Save post"}
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuItem onClick={() => setIsEditing(true)} className="cursor-pointer gap-2 py-2 text-sm text-gray-700">
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
          <ReportDialog open={reportOpen} onOpenChange={setReportOpen} type="POST" targetId={post.id} />
        </>
      }
      body={
        isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              className="text-[15px] rounded-xl border-gray-200"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="rounded-full text-xs cursor-pointer">
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-full text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                onClick={() => editMutation.mutate()}
                disabled={editMutation.isPending || !editCaption.trim()}
              >
                {editMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {post.caption && (
              <ClickableRegion onActivate={() => openSinglePost()} ariaLabel="Open post">
                <CaptionText text={post.caption} backgroundStyle={post.backgroundStyle} />
              </ClickableRegion>
            )}
            <MediaGrid
              media={post.media}
              onOpen={openSinglePost}
              onRetryMedia={isOwner ? (mediaId) => retryMediaMutation.mutate(mediaId) : undefined}
              postId={post.id}
            />
          </>
        )
      }
      statsRow={
        (post.totalReactionCount! > 0 || post.likeCount > 0 || post.commentCount > 0 || (post.shareCount ?? 0) > 0) && (
          <div className="flex items-center justify-between text-xs text-gray-500 pb-2">
            <ReactionSummary postId={String(post.id)} summary={post.reactionSummary} totalCount={post.totalReactionCount ?? post.likeCount} topReactors={post.topReactors} />
            <div className="flex items-center gap-3">
              {post.commentCount > 0 && <span>{post.commentCount} comments</span>}
              {(post.shareCount ?? 0) > 0 && <span>{post.shareCount} shares</span>}
            </div>
          </div>
        )
      }
      actionsRow={
        <>
          <ReactionControl
            viewerReaction={post.viewerReaction || (post.isLikedByMe ? "LIKE" : null)}
            onReact={(reaction) => reactMutation.mutate(reaction)}
            onRemoveReaction={() => reactMutation.mutate(null)}
            disabled={reactMutation.isPending}
          />

          <button
            type="button"
            onClick={() => setCommentModalOpen(true)}
            className="flex items-center gap-1.5 transition-colors cursor-pointer hover:text-purple-600"
            aria-label="Comment"
          >
            <MessageCircle className="w-4.5 h-4.5" />
            <span>Comment</span>
          </button>

          <button
            className="flex items-center gap-1.5 hover:text-purple-600 transition-colors ml-auto cursor-pointer"
            onClick={handleShare}
            aria-label="Share post"
          >
            <Share2 className="w-4.5 h-4.5" />
            <span>Share</span>
          </button>
        </>
      }
      footer={
        <>
          <CommentPreview
            comments={post.commentPreviews}
            commentCount={post.commentCount || 0}
            onOpen={() => setCommentModalOpen(true)}
          />

          <CommentModal postId={String(post.id)} open={commentModalOpen} onOpenChange={setCommentModalOpen} />

          <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <AlertDialogContent className="rounded-2xl border border-gray-100">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                <AlertDialogDescription>
                  This can&apos;t be undone. The post will be removed for everyone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-full"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      }
    />
  );
}
