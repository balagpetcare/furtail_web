"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postsApi, postsKeys, type Post } from "@/lib/api/posts";
import { toast } from "sonner";

/**
 * Shared like/bookmark/share/edit/delete mutations for a single post —
 * used by the Single Post page and the Comment modal (both real,
 * standalone surfaces that need the exact same post mutations). The feed
 * card (`PostCard`) intentionally keeps its own inline copy rather than
 * adopting this hook, to avoid touching the already-stable, heavily-used
 * feed card while extracting shared logic for the two new surfaces.
 */
export function usePostActions(post: Post | undefined, options: { onDeleted?: () => void } = {}) {
  const queryClient = useQueryClient();
  const invalidateFeeds = () => queryClient.invalidateQueries({ queryKey: postsKeys.all });

  const likeMutation = useMutation({
    mutationFn: () => (post!.isLikedByMe ? postsApi.unlikePost(String(post!.id)) : postsApi.likePost(String(post!.id))),
    onSuccess: invalidateFeeds,
    onError: () => toast.error("Failed to update like"),
  });

  // Full reaction (LIKE/LOVE/AWW/...), not just the legacy binary like —
  // mirrors PostCard's own reactMutation so both surfaces reconcile
  // against the same authoritative server response (aggregate counts +
  // viewer's own reaction) via the same invalidation, not an optimistic
  // guess that never gets corrected.
  const reactMutation = useMutation({
    mutationFn: (reaction: string | null) =>
      reaction === null
        ? postsApi.unlikePost(String(post!.id))
        : postsApi.reactPost(String(post!.id), reaction),
    onMutate: async (newReaction) => {
      await queryClient.cancelQueries({ queryKey: postsKeys.all });
      const previousFeeds = queryClient.getQueriesData({ queryKey: postsKeys.all });
      
      queryClient.setQueriesData({ queryKey: postsKeys.all }, (old: any) => {
        if (!old) return old;
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.map((p: any) => {
                if (p.id === post?.id) {
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
        } else if (old.id === post?.id) {
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
    mutationFn: () => (post!.isBookmarkedByMe ? postsApi.unbookmarkPost(String(post!.id)) : postsApi.bookmarkPost(String(post!.id))),
    onSuccess: () => {
      invalidateFeeds();
      toast.success(post!.isBookmarkedByMe ? "Removed from saved" : "Saved");
    },
    onError: () => toast.error("Failed to update saved posts"),
  });

  const shareMutation = useMutation({
    mutationFn: () => postsApi.sharePost(String(post!.id)),
    onSuccess: invalidateFeeds,
    onError: () => toast.error("Failed to share post"),
  });

  const editMutation = useMutation({
    mutationFn: (caption: string) => postsApi.editPost(String(post!.id), { caption }),
    onSuccess: () => {
      invalidateFeeds();
      toast.success("Post updated");
    },
    onError: () => toast.error("Failed to update post"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.deletePost(String(post!.id)),
    onSuccess: () => {
      invalidateFeeds();
      toast.success("Post deleted");
      options.onDeleted?.();
    },
    onError: () => toast.error("Failed to delete post"),
  });

  const share = async () => {
    if (!post) return;
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

  return { likeMutation, reactMutation, bookmarkMutation, shareMutation, editMutation, deleteMutation, share, invalidateFeeds };
}
