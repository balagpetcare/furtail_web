"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { postsApi, postsKeys } from "@/lib/api/posts";
import { X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { LoadingSkeleton, ErrorState } from "@/components/ui/design-system";
import { MediaCarousel } from "@/components/feed/media-carousel";
import { PostHeader } from "@/components/post/post-header";
import { PostActionsRow } from "@/components/post/post-actions-row";
import { PostOptionsMenu } from "@/components/post/post-options-menu";
import { CaptionText } from "@/components/feed/caption-text";
import { Comments } from "@/components/post/comments";
import { usePostActions } from "@/components/post/use-post-actions";
import { fetchApi } from "@/lib/api-client";
import { getMediaUrl } from "@/lib/media";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { hasInternalAppHistory } from "@/lib/return-navigation";

/**
 * The real, shareable Single Post page — `/post/[id]`, rendered outside
 * AppShell (see `(post)/layout.tsx`) so it gets the full viewport instead
 * of the app's fixed sidebar columns. Desktop: large media carousel on
 * the left, post info + the full comment system on the right
 * (independently scrollable, each filling the viewport height since there
 * is no global header here to subtract). Mobile: stacked (header →
 * caption → media → actions → composer → comments). Real data fetching
 * (postsApi.getPost by id) — works on direct load, refresh, and share,
 * with no dependency on Home's client state.
 */
export default function SinglePostPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const postId = params.id as string;
  const initialMediaIndex = Number(searchParams.get("media") ?? "0") || 0;

  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState("");

  const { data: post, isLoading, error } = useQuery({
    queryKey: postsKeys.detail(postId),
    queryFn: () => postsApi.getPost(postId),
    enabled: !!postId,
  });

  const { data: me } = useQuery({
    queryKey: ["user", "me"],
    queryFn: () => fetchApi<{ id: number }>("/user/me"),
  });
  const isOwner = post ? me?.id === post.author.id : false;

  const { likeMutation, bookmarkMutation, editMutation, deleteMutation, share } = usePostActions(post, {
    onDeleted: () => router.push("/"),
  });

  // Prefer real browser/router history (also restores the origin page's
  // exact scroll position — see use-scroll-restoration.ts, wired into
  // Home). Only trusted when this tab actually rendered a real in-app page
  // before now; otherwise (direct load, pasted link, new tab) there is
  // nothing safe to go back to, so this falls back to Home rather than
  // risk leaving the app entirely.
  const handleClose = () => {
    if (hasInternalAppHistory()) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const safeDisplayName = post
    ? (() => {
        const name = post.author.displayName || post.author.username;
        return typeof name === "string" && name.trim().length > 0 ? name.trim() : "Furtail User";
      })()
    : "";

  const media = (post?.media ?? []).filter((m) => m.url);

  return (
    <div className="bg-white min-h-screen relative">
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
        <Link
          href="/"
          aria-label="Furtail Home"
          className="h-10 px-4 rounded-full bg-white shadow-md border border-gray-100 hover:bg-gray-100 flex items-center justify-center font-extrabold text-lg text-purple-600 tracking-tight select-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
        >
          Furtail
        </Link>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close post"
          className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {isLoading && (
        <div className="p-4 sm:p-6 pt-16 max-w-2xl mx-auto">
          <LoadingSkeleton />
        </div>
      )}

      {error && (
        <div className="p-4 sm:p-6 pt-16 max-w-2xl mx-auto">
          <ErrorState title="Failed to load post" description="There was a problem loading this post. It might have been deleted." />
        </div>
      )}

      {post && (
        <div className="xl:max-w-[1400px] xl:mx-auto lg:grid lg:grid-cols-[1.6fr_1fr] lg:items-start">
          {media.length > 0 && (
            <div className="hidden lg:flex items-center justify-center relative bg-black w-full h-screen lg:sticky lg:top-0">
              <MediaCarousel key={`lg-${initialMediaIndex}`} media={media} initialIndex={initialMediaIndex} />
            </div>
          )}

          <div
            className={
              media.length > 0
                ? "lg:h-screen lg:sticky lg:top-0 lg:overflow-y-auto"
                : "max-w-2xl mx-auto"
            }
          >
            <div className="p-4 pt-16 sm:p-6 sm:pt-16 lg:pt-6 space-y-4">
              <PostHeader
                avatarUrl={getMediaUrl(post.author.avatarUrl || null)}
                avatarFallback={safeDisplayName.charAt(0).toUpperCase()}
                avatarHref={`/profile/${post.author.userId}`}
                title={safeDisplayName}
                meta={
                  <>
                    {post.author.username && <span className="truncate max-w-[120px]">@{post.author.username}</span>}
                    <span>•</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </>
                }
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

              {/* Small-screen media (large-screen media is the sticky left column above) */}
              {media.length > 0 && (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-square sm:aspect-[4/3] lg:hidden">
                  <MediaCarousel key={`sm-${initialMediaIndex}`} media={media} initialIndex={initialMediaIndex} />
                </div>
              )}

              {(post.likeCount > 0 || post.commentCount > 0 || (post.shareCount ?? 0) > 0) && (
                <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 pb-3">
                  <span>{post.likeCount > 0 ? `${post.likeCount} like${post.likeCount === 1 ? "" : "s"}` : ""}</span>
                  <div className="flex items-center gap-3">
                    {post.commentCount > 0 && <span>{post.commentCount} comments</span>}
                    {(post.shareCount ?? 0) > 0 && <span>{post.shareCount} shares</span>}
                  </div>
                </div>
              )}

              <PostActionsRow
                viewerReaction={post.viewerReaction || (post.isLikedByMe ? "LIKE" : null)}
                likePending={likeMutation.isPending}
                onReact={(r) => likeMutation.mutate()} // Hack for now, page.tsx needs full reactMutation
                onRemoveReaction={() => likeMutation.mutate()}
                onShare={share}
              />

              <div className="border-t border-gray-100 pt-1 pb-8">
                <Comments postId={String(post.id)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
