"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { postsApi, postsKeys, normalizeAuthor } from "@/lib/api/posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { ProfileAvatarLink, ProfileNameLink } from "@/components/post/user-profile-link";
import { ExpandableText } from "@/components/ui/expandable-text";
import { Heart, MoreHorizontal, Edit2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchApi } from "@/lib/api-client";
import { toast } from "sonner";
import {
  type RawComment,
  type CommentsCache,
  getPageItems,
  setPageItems,
  dedupeById,
  updateFirstPage,
  updateAllPages,
  extractComment,
} from "@/lib/comments-cache";

function formatDistanceToNowFallback(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function useCurrentUserLite() {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: () => fetchApi<{ id: number; profile: { displayName: string; avatarMedia: { url: string } | null } }>("/user/me"),
  });
}

export function Comments({ postId, hideComposer = false }: { postId: string; hideComposer?: boolean }) {
  const { data: user } = useCurrentUserLite();

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: postsKeys.comments(postId),
    queryFn: ({ pageParam, signal }) => postsApi.getComments(postId, pageParam as string | undefined, 20, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: undefined as string | undefined,
  });

  const comments = data?.pages.flatMap((page) => getPageItems(page)) ?? [];

  return (
    <div className="mt-6">
      <h3 className="font-bold text-gray-900 mb-4 px-2">Comments</h3>

      {!hideComposer && <CommentComposer postId={postId} currentUser={user} />}

      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading comments...</div>
        ) : isError ? (
          <div className="p-12 text-center text-red-500 bg-red-50 rounded-2xl">
            Failed to load comments.
          </div>
        ) : comments.length === 0 ? (
          <div className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl">
            No comments yet. Be the first to reply!
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              currentUserId={user?.id != null ? String(user.id) : undefined}
            />
          ))
        )}

        {hasNextPage && (
          <div className="text-center pt-4 pb-2">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading..." : "Load more comments"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentComposer({
  postId,
  currentUser,
  compact = false,
  autoFocus = false,
}: {
  postId: string;
  currentUser?: { id: number; profile: { displayName: string; avatarMedia: { url: string } | null } };
  /** Sticky-footer layout (Post Detail modal): smaller avatar, single-line
   * pill input, no visible Comment button (Enter submits). Default layout
   * (inline, top of the comment list) is unchanged. */
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (newText: string) => postsApi.addComment(postId, newText),
    onMutate: async (newText: string) => {
      await queryClient.cancelQueries({ queryKey: postsKeys.comments(postId) });
      const previous = queryClient.getQueryData<CommentsCache>(postsKeys.comments(postId));
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: RawComment = {
        id: tempId,
        text: newText,
        createdAt: new Date().toISOString(),
        user: currentUser
          ? { id: currentUser.id, displayName: currentUser.profile.displayName, avatarMedia: currentUser.profile.avatarMedia }
          : undefined,
        likeCount: 0,
        isLikedByMe: false,
        replyCount: 0,
      };
      queryClient.setQueryData<CommentsCache>(postsKeys.comments(postId), (old) => updateFirstPage(old, (items) => [optimistic, ...items]));
      return { previous, tempId };
    },
    onError: (_err, vars, ctx) => {
      if (ctx) queryClient.setQueryData(postsKeys.comments(postId), ctx.previous);
      // Retain the text on failure — the user shouldn't have to retype a
      // comment just because the request failed. Only a successful post
      // clears the box.
      setText(vars);
      toast.error("Failed to post comment", {
        action: { label: "Retry", onClick: () => addMutation.mutate(vars) },
      });
    },
    onSuccess: (result, _vars, ctx) => {
      const real = extractComment(result);
      queryClient.setQueryData<CommentsCache>(postsKeys.comments(postId), (old) =>
        updateAllPages(old, (items) => items.map((c) => (String(c.id) === ctx.tempId ? real : c)))
      );
      // Keeps the feed card's commentCount badge in sync without a full
      // comments refetch (which would risk momentarily showing the
      // optimistic entry twice while the new page and the still-in-flight
      // old one both resolve).
      queryClient.invalidateQueries({ queryKey: postsKeys.all });
      setText("");
    },
  });

  const displayName = currentUser?.profile?.displayName;
  const placeholder = displayName ? `Comment as ${displayName}` : "Write a comment...";
  const submit = () => {
    if (text.trim() && !addMutation.isPending) addMutation.mutate(text);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2.5">
        <Avatar className="w-8 h-8 border border-gray-100 shrink-0">
          <AvatarImage src={getMediaUrl(currentUser?.profile?.avatarMedia?.url ?? null)} alt="Your avatar" />
          <AvatarFallback>{currentUser?.profile?.displayName?.[0] || "U"}</AvatarFallback>
        </Avatar>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          autoFocus={autoFocus}
          className="flex-1 bg-gray-100 border border-transparent rounded-full outline-none text-gray-800 placeholder-gray-500 text-sm h-9 px-4 focus:bg-white focus:border-gray-200 focus:ring-2 focus:ring-purple-200 transition-all"
          placeholder={placeholder}
          aria-label={placeholder}
        />
        <Button
          size="sm"
          className="rounded-full bg-purple-600 hover:bg-purple-700 shrink-0"
          disabled={!text.trim() || addMutation.isPending}
          onClick={submit}
        >
          {addMutation.isPending ? "Posting..." : "Post"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-6 px-2">
      <Avatar className="w-8 h-8 border border-gray-100 mt-1">
        <AvatarImage src={getMediaUrl(currentUser?.profile?.avatarMedia?.url ?? null)} alt="Your Avatar" />
        <AvatarFallback>{currentUser?.profile?.displayName?.[0] || "U"}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl resize-none outline-none text-gray-800 placeholder-gray-400 min-h-[40px] text-sm p-3 focus:ring-2 focus:ring-purple-200 transition-all"
          placeholder={placeholder}
        />
        <div className="flex justify-end mt-2 gap-2">
          <Button
            size="sm"
            className="rounded-full bg-purple-600 hover:bg-purple-700"
            disabled={!text.trim() || addMutation.isPending}
            onClick={submit}
          >
            {addMutation.isPending ? "Posting..." : "Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReplyComposer({
  postId,
  parentId,
  onPosted,
  onCancel,
}: {
  postId: string;
  parentId: string;
  onPosted: (reply: RawComment) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const { data: user } = useCurrentUserLite();

  // Replies have no cache to reconcile: `listComments` never returns nested
  // replies (confirmed against social-store.ts — there's no GET endpoint
  // for them at all), so the only place a posted reply can ever be shown
  // is here, from the real response to this POST, appended by the parent
  // via `onPosted`. Nothing to dedupe against later because nothing ever
  // re-fetches it.
  const replyMutation = useMutation({
    mutationFn: (newText: string) => postsApi.replyComment(postId, parentId, newText),
    onSuccess: (result) => {
      onPosted(extractComment(result));
      setText("");
      onCancel();
    },
    onError: () => toast.error("Failed to post reply"),
  });

  return (
    <div className="flex gap-3 mb-2 px-2">
      <Avatar className="w-7 h-7 border border-gray-100 mt-1">
        <AvatarImage src={getMediaUrl(user?.profile?.avatarMedia?.url ?? null)} alt="Your Avatar" />
        <AvatarFallback className="text-xs">{user?.profile?.displayName?.[0] || "U"}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl resize-none outline-none text-gray-800 placeholder-gray-400 min-h-[36px] text-sm p-2.5 focus:ring-2 focus:ring-purple-200 transition-all"
          placeholder="Post your reply..."
        />
        <div className="flex justify-end mt-2 gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="rounded-full bg-purple-600 hover:bg-purple-700"
            disabled={!text.trim() || replyMutation.isPending}
            onClick={() => replyMutation.mutate(text)}
          >
            {replyMutation.isPending ? "Posting..." : "Reply"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Memoized: updateAllPages()/updateFirstPage() only ever create a new
 * object for the comment a mutation actually touched (Array.map returns
 * the same reference for every other item — see comments-cache.ts), so a
 * like/edit/delete on one comment must not re-render every sibling row in
 * a thread that may have thousands loaded.
 */
const CommentItem = React.memo(function CommentItem({
  comment,
  postId,
  currentUserId,
}: {
  comment: RawComment;
  postId: string;
  currentUserId?: string;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text || "");
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const queryClient = useQueryClient();

  const commentUser = comment.user as { id?: number | string } | undefined;
  const isOwner = String(currentUserId) === String(commentUser?.id ?? "");

  const patchComment = (patch: Partial<RawComment>) =>
    queryClient.setQueryData<CommentsCache>(postsKeys.comments(postId), (old) =>
      updateAllPages(old, (items) => items.map((c) => (c.id === comment.id ? { ...c, ...patch } : c)))
    );

  const likeMutation = useMutation({
    mutationFn: () => postsApi.likeComment(postId, String(comment.id)),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: postsKeys.comments(postId) });
      const previous = queryClient.getQueryData<CommentsCache>(postsKeys.comments(postId));
      patchComment({ isLikedByMe: true, likeCount: (comment.likeCount || 0) + 1 });
      return { previous };
    },
    onError: (_err, _vars, ctx) => ctx && queryClient.setQueryData(postsKeys.comments(postId), ctx.previous),
  });

  const unlikeMutation = useMutation({
    mutationFn: () => postsApi.unlikeComment(postId, String(comment.id)),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: postsKeys.comments(postId) });
      const previous = queryClient.getQueryData<CommentsCache>(postsKeys.comments(postId));
      patchComment({ isLikedByMe: false, likeCount: Math.max(0, (comment.likeCount || 1) - 1) });
      return { previous };
    },
    onError: (_err, _vars, ctx) => ctx && queryClient.setQueryData(postsKeys.comments(postId), ctx.previous),
  });

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.deleteComment(postId, String(comment.id)),
    onSuccess: () => {
      queryClient.setQueryData<CommentsCache>(postsKeys.comments(postId), (old) =>
        updateAllPages(old, (items) => items.filter((c) => c.id !== comment.id))
      );
      queryClient.invalidateQueries({ queryKey: postsKeys.all });
    },
    onError: () => toast.error("Failed to delete comment"),
  });

  const editMutation = useMutation({
    mutationFn: () => postsApi.editComment(postId, String(comment.id), editText),
    onSuccess: (result) => {
      const real = extractComment(result);
      setIsEditing(false);
      patchComment({ text: real?.text ?? editText, isEdited: true });
    },
    onError: () => toast.error("Failed to update comment"),
  });

  const handleLike = () => {
    if (comment.isLikedByMe) {
      unlikeMutation.mutate();
    } else {
      likeMutation.mutate();
    }
  };

  const author = normalizeAuthor(comment.user);
  const isOptimistic = String(comment.id).startsWith("temp-");
  const knownReplyCount = comment.replyCount ?? 0;

  return (
    <div className="flex gap-3 py-2 px-2">
      <ProfileAvatarLink userId={author.userId} displayName={author.displayName} avatarUrl={author.avatarUrl} />

      <div className="flex-1">
        <div className="bg-gray-50 rounded-2xl p-3 px-4 inline-block min-w-[200px] max-w-full relative group">
          <div className="flex justify-between items-start gap-4">
            <ProfileNameLink userId={author.userId} displayName={author.displayName} />
            {isOwner && !isOptimistic && (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <div className="text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                    <MoreHorizontal className="w-4 h-4" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteMutation.mutate()} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl resize-none outline-none text-gray-800 min-h-[40px] text-sm p-2 focus:ring-2 focus:ring-purple-200"
              />
              <div className="flex justify-end mt-2 gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>Save</Button>
              </div>
            </div>
          ) : (
            <ExpandableText text={comment.text} className="text-sm text-gray-800 mt-1" />
          )}
        </div>

        <div className="flex items-center gap-4 mt-1 px-2 text-xs text-gray-500 font-medium">
          <span>{isOptimistic ? "Just now" : comment.createdAt ? formatDistanceToNowFallback(comment.createdAt) : ""}</span>
          {!isOptimistic && (
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors ${comment.isLikedByMe ? "text-red-500" : "hover:text-gray-900"}`}
            >
              <Heart className={`w-3 h-3 ${comment.isLikedByMe ? "fill-current" : ""}`} />
              {(comment.likeCount ?? 0) > 0 && <span>{comment.likeCount}</span>}
            </button>
          )}
          {!isOptimistic && (
            <button onClick={() => setIsReplying(!isReplying)} className="hover:text-gray-900">
              Reply
            </button>
          )}
          {knownReplyCount > 0 && !repliesExpanded && (
            <button
              type="button"
              onClick={() => setRepliesExpanded(true)}
              className="text-gray-500 hover:text-gray-900 font-semibold cursor-pointer"
            >
              View {knownReplyCount} {knownReplyCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>

        {isReplying && (
          <div className="mt-3">
            <ReplyComposer
              postId={postId}
              parentId={String(comment.id)}
              onPosted={(reply) => {
                setRepliesExpanded(true);
                queryClient.setQueryData<CommentsCache>(repliesQueryKey(postId, comment.id), (old) => {
                  if (!old?.pages?.length) {
                    return { pages: [[reply]], pageParams: [undefined] };
                  }
                  // Replies render oldest-first — a fresh one belongs at the
                  // end of the already-loaded set, not prepended like a
                  // top-level comment.
                  const pages = [...old.pages];
                  const lastIndex = pages.length - 1;
                  pages[lastIndex] = setPageItems(
                    pages[lastIndex]!,
                    dedupeById([...getPageItems(pages[lastIndex]!), reply]),
                  );
                  return { ...old, pages };
                });
                setIsReplying(false);
              }}
              onCancel={() => setIsReplying(false)}
            />
          </div>
        )}

        {repliesExpanded && (
          <RepliesList postId={postId} comment={comment} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  );
});

function repliesQueryKey(postId: string, commentId: string | number) {
  return [...postsKeys.comments(postId), "replies", String(commentId)] as const;
}

/**
 * Lazily fetches one comment's replies via the real
 * GET /posts/:postId/comments/:commentId/replies cursor-paginated endpoint
 * — only once the user actually expands them ("View N replies"), and only
 * a page at a time thereafter ("View more replies"). Never preloads a
 * whole reply tree. A newly-posted reply is written into this exact query
 * cache by CommentItem's ReplyComposer onPosted handler (same
 * dedupe-by-id safety net top-level comments use), so it's the same real
 * cache being read here, not a second parallel state system.
 */
function RepliesList({
  postId,
  comment,
  currentUserId,
}: {
  postId: string;
  comment: RawComment;
  currentUserId?: string;
}) {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: repliesQueryKey(postId, comment.id),
    queryFn: ({ pageParam, signal }) =>
      postsApi.getReplies(postId, String(comment.id), pageParam as string | undefined, 20, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: undefined as string | undefined,
  });

  const replies = data?.pages.flatMap((page) => getPageItems(page)) ?? [];

  return (
    <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-100">
      {isLoading && <p className="text-xs text-gray-400 pl-1">Loading replies...</p>}
      {isError && <p className="text-xs text-red-500 pl-1">Failed to load replies.</p>}
      {replies.map((reply) => (
        <ReplyRow key={reply.id} reply={reply} postId={postId} currentUserId={currentUserId} />
      ))}
      {hasNextPage && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 pl-1 cursor-pointer disabled:opacity-50"
        >
          {isFetchingNextPage ? "Loading..." : "View more replies"}
        </button>
      )}
    </div>
  );
}

/**
 * A reply that only ever exists in its parent `CommentItem`'s local state
 * (see the comment on `ReplyComposer` — there's no way to fetch existing
 * replies back from the backend at all, so nothing here touched the
 * top-level comments query cache). Delete removes it from the real,
 * shared replies query cache (repliesQueryKey) so RepliesList — the only
 * reader of that cache — reflects it immediately without a refetch.
 */
const ReplyRow = React.memo(function ReplyRow({
  reply,
  postId,
  currentUserId,
}: {
  reply: RawComment;
  postId: string;
  currentUserId?: string;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(reply.text || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isLiked, setIsLiked] = useState(Boolean(reply.isLikedByMe));
  const [likeCount, setLikeCount] = useState(reply.likeCount ?? 0);

  const replyUser = reply.user as { id?: number | string } | undefined;
  const isOwner = String(currentUserId) === String(replyUser?.id ?? "");
  const author = normalizeAuthor(reply.user);
  const isOptimistic = String(reply.id).startsWith("temp-");

  const likeMutation = useMutation({
    mutationFn: () => (isLiked ? postsApi.unlikeComment(postId, String(reply.id)) : postsApi.likeComment(postId, String(reply.id))),
    onMutate: () => {
      setIsLiked((v) => !v);
      setLikeCount((c) => (isLiked ? Math.max(0, c - 1) : c + 1));
    },
    onError: () => {
      setIsLiked((v) => !v);
      setLikeCount((c) => (isLiked ? c + 1 : Math.max(0, c - 1)));
      toast.error("Failed to update like");
    },
  });

  const editMutation = useMutation({
    mutationFn: () => postsApi.editComment(postId, String(reply.id), text),
    onSuccess: () => setIsEditing(false),
    onError: () => toast.error("Failed to update reply"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.deleteComment(postId, String(reply.id)),
    onSuccess: () => {
      if (reply.parentId == null) return;
      queryClient.setQueryData<CommentsCache>(repliesQueryKey(postId, reply.parentId), (old) =>
        updateAllPages(old, (items) => items.filter((r) => r.id !== reply.id))
      );
    },
    onError: () => toast.error("Failed to delete reply"),
  });

  return (
    <div className="flex gap-2.5">
      <ProfileAvatarLink
        userId={author.userId}
        displayName={author.displayName}
        avatarUrl={author.avatarUrl}
        className="w-7 h-7 border border-gray-100"
      />
      <div className="flex-1">
        <div className="bg-gray-50 rounded-2xl p-2.5 px-3.5 inline-block min-w-[160px] max-w-full relative group">
          <div className="flex justify-between items-start gap-3">
            <ProfileNameLink
              userId={author.userId}
              displayName={author.displayName}
              className="font-semibold text-xs text-gray-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
            />
            {isOwner && !isOptimistic && (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <div className="text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteMutation.mutate()} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl resize-none outline-none text-gray-800 min-h-[36px] text-xs p-2 focus:ring-2 focus:ring-purple-200"
              />
              <div className="flex justify-end mt-2 gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>Save</Button>
              </div>
            </div>
          ) : (
            <ExpandableText text={text} className="text-xs text-gray-800 mt-0.5" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 px-2 text-[11px] text-gray-500 font-medium">
          <span>{isOptimistic ? "Just now" : reply.createdAt ? formatDistanceToNowFallback(reply.createdAt) : ""}</span>
          {!isOptimistic && (
            <button
              onClick={() => likeMutation.mutate()}
              className={`flex items-center gap-1 transition-colors ${isLiked ? "text-red-500" : "hover:text-gray-900"}`}
            >
              <Heart className={`w-3 h-3 ${isLiked ? "fill-current" : ""}`} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
