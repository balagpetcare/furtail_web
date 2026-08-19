"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { postsApi, postsKeys } from "@/lib/api/posts";
import { getMediaUrl } from "@/lib/media";
import { LoadingSkeleton, ErrorState } from "@/components/ui/design-system";
import { MediaCarousel } from "@/components/feed/media-carousel";
import { PostHeader } from "@/components/post/post-header";
import { PostActionsRow } from "@/components/post/post-actions-row";
import { PostOptionsMenu } from "@/components/post/post-options-menu";
import { CaptionText } from "@/components/feed/caption-text";
import { Comments, CommentComposer, useCurrentUserLite } from "@/components/post/comments";
import { usePostActions } from "@/components/post/use-post-actions";
import { ReactionSummary } from "@/components/social/reaction-summary";
import { PostContextMeta } from "@/components/post/post-context-meta";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ReactionType } from "@/components/social/reaction-control";
import { useState } from "react";

const KNOWN_REACTIONS: ReactionType[] = ["LIKE", "LOVE", "AWW", "HAHA", "WOW", "SAD", "ANGRY"];
function asReactionType(value: string | null | undefined): ReactionType | null {
  return value && (KNOWN_REACTIONS as string[]).includes(value) ? (value as ReactionType) : null;
}

/**
 * Facebook-style Post Detail / Comment modal — the "Comment", comment
 * count, and caption-click surfaces all open this. Three fixed structural
 * regions (sticky header / scrollable body / sticky composer), a WHITE
 * body throughout — never the Single Post page's immersive black media
 * viewer (that component, MediaCarousel, is reused here in its "inline"
 * variant specifically so this modal never gets zoom/pan/fullscreen/black
 * background — see MediaCarousel's own doc comment). Comments come from
 * the exact same `<Comments>` component the Single Post page uses (with
 * its internal composer hidden — this modal renders its own sticky-footer
 * instance of the same `CommentComposer`), so there is one real comment
 * implementation, not two.
 *
 * Scroll locking, focus trap, Escape-to-close, and focus restoration to
 * the triggering element all come from the underlying base-ui Dialog
 * primitive (`modal: true` by default) — not reimplemented here.
 */
export function CommentModal({
  postId,
  open,
  onOpenChange,
}: {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 ring-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-[100dvh] max-w-none rounded-none sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[calc(100vw-24px)] sm:h-auto sm:max-h-[92vh] sm:max-w-[680px] sm:rounded-2xl overflow-hidden flex flex-col bg-white"
      >
        {postId && <CommentModalBody postId={postId} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

function CommentModalBody({ postId, onOpenChange }: { postId: string; onOpenChange: (open: boolean) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState("");

  const { data: post, isLoading, error } = useQuery({
    queryKey: postsKeys.detail(postId),
    queryFn: () => postsApi.getPost(postId),
  });

  const { data: me } = useCurrentUserLite();
  const isOwner = post ? me?.id === post.author.id : false;

  const { reactMutation, bookmarkMutation, editMutation, deleteMutation, share } = usePostActions(post, {
    onDeleted: () => onOpenChange(false),
  });

  const safeDisplayName = post
    ? (() => {
        const name = post.author.displayName || post.author.username;
        return typeof name === "string" && name.trim().length > 0 ? name.trim() : "Furtail User";
      })()
    : "";

  const media = (post?.media ?? []).filter((m) => m.url);

  return (
    <>
      {/* A. Sticky header — never scrolls, white, close button on the right. */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-white shadow-sm z-10">
        <DialogTitle className="font-bold text-gray-900 text-base truncate">
          {post ? `${safeDisplayName}'s Post` : "Post"}
        </DialogTitle>
        <DialogClose
          aria-label="Close post"
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <X className="w-5 h-5" />
        </DialogClose>
      </div>

      {/* B. Scrollable body — the ONLY region that scrolls. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white">
        <div className="p-4 sm:p-5 space-y-4 pb-8">
          {isLoading && <LoadingSkeleton />}
          {error && <ErrorState title="Failed to load post" description="It might have been deleted." />}

          {post && (
            <>
              <PostHeader
                avatarUrl={getMediaUrl(post.author.avatarUrl || null)}
                avatarFallback={safeDisplayName.charAt(0).toUpperCase()}
                avatarHref={`/profile/${post.author.userId}`}
                title={safeDisplayName}
                meta={<PostContextMeta post={post} />}
                menu={
                  <PostOptionsMenu
                    postId={post.id}
                    isOwner={isOwner}
                    isBookmarked={Boolean(post.isBookmarkedByMe)}
                    onToggleBookmark={() => bookmarkMutation.mutate()}
                    onEdit={() => {
                      setEditCaption(post.caption || "");
                      setIsEditing(true);
                    }}
                    onDelete={() => deleteMutation.mutate()}
                  />
                }
              />

              {isEditing ? (
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
                      onClick={() => {
                        editMutation.mutate(editCaption);
                        setIsEditing(false);
                      }}
                      disabled={editMutation.isPending || !editCaption.trim()}
                    >
                      {editMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                post.caption && <CaptionText text={post.caption} />
              )}

              {/* Images render naturally in the white body — no black
                  stage, no zoom/rotate/fullscreen/gallery toolbar. */}
              {media.length > 0 && <MediaCarousel media={media} variant="inline" />}

              {(post.likeCount > 0 || post.commentCount > 0 || (post.shareCount ?? 0) > 0) && (
                <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 pb-3">
                  <ReactionSummary postId={String(post.id)} summary={post.reactionSummary} totalCount={post.totalReactionCount ?? post.likeCount} topReactors={post.topReactors} />
                  <div className="flex items-center gap-3">
                    {post.commentCount > 0 && <span>{post.commentCount} comments</span>}
                    {(post.shareCount ?? 0) > 0 && <span>{post.shareCount} shares</span>}
                  </div>
                </div>
              )}

              <PostActionsRow
                viewerReaction={asReactionType(post.viewerReaction) ?? (post.isLikedByMe ? "LIKE" : null)}
                likePending={reactMutation.isPending}
                onReact={(r) => reactMutation.mutate(r)}
                onRemoveReaction={() => reactMutation.mutate(null)}
                onShare={share}
              />

              <div className="border-t border-gray-100 pt-1">
                <Comments postId={String(post.id)} hideComposer />
              </div>
            </>
          )}
        </div>
      </div>

      {/* C. Sticky composer — always visible, white, safe-area aware. */}
      {post && (
        <div
          className="shrink-0 border-t border-gray-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3"
          style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
        >
          <CommentComposer postId={String(post.id)} currentUser={me} compact />
        </div>
      )}
    </>
  );
}
