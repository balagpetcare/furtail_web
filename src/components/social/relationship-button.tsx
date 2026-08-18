"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { socialApi, socialKeys } from "@/lib/api/social";
import { toast } from "sonner";
import { UserPlus, UserCheck, Clock, Check, X, Bell, BellPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface RelationshipButtonProps {
  userId: string;
  /** Stacks buttons vertically and shrinks padding for narrow rail/card contexts — visual only, same mutations/states. */
  compact?: boolean;
}

export function RelationshipButton({ userId, compact = false }: RelationshipButtonProps) {
  const queryClient = useQueryClient();
  const wrapClass = compact ? "flex flex-col gap-1.5 w-full" : "flex gap-2";
  const primaryClass = compact ? "rounded-full w-full text-xs px-3 h-8" : "rounded-full px-6";
  const primaryClassWide = compact ? "rounded-full w-full text-xs px-3 h-8" : "rounded-full px-8";

  const { data: status, isLoading } = useQuery({
    queryKey: socialKeys.status(userId),
    queryFn: () => socialApi.getStatus(userId),
    enabled: !!userId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: socialKeys.status(userId) });
    queryClient.invalidateQueries({ queryKey: socialKeys.counts(userId) });
  };

  const onError = (err: unknown, fallback: string) =>
    toast.error((err instanceof Error ? err.message : undefined) || fallback);

  const followMutation = useMutation({
    mutationFn: () => socialApi.followUser(userId),
    onSuccess: invalidate,
    onError: (err: unknown) => onError(err, "Failed to follow"),
  });

  const unfollowMutation = useMutation({
    mutationFn: () => socialApi.unfollowUser(userId),
    onSuccess: invalidate,
    onError: (err: unknown) => onError(err, "Failed to unfollow"),
  });

  const requestFriendMutation = useMutation({
    mutationFn: () => socialApi.sendFriendRequest(userId),
    onSuccess: invalidate,
    onError: (err: unknown) => onError(err, "Failed to send request"),
  });

  const cancelRequestMutation = useMutation({
    mutationFn: (reqId: string | number) => socialApi.cancelFriendRequest(reqId),
    onSuccess: invalidate,
    onError: (err: unknown) => onError(err, "Failed to cancel request"),
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (reqId: string | number) => socialApi.acceptFriendRequest(reqId),
    onSuccess: invalidate,
    onError: (err: unknown) => onError(err, "Failed to accept request"),
  });

  const rejectRequestMutation = useMutation({
    mutationFn: (reqId: string | number) => socialApi.rejectFriendRequest(reqId),
    onSuccess: invalidate,
    onError: (err: unknown) => onError(err, "Failed to decline request"),
  });

  const unfriendMutation = useMutation({
    mutationFn: () => socialApi.unfriend(userId),
    onSuccess: invalidate,
    onError: (err: unknown) => onError(err, "Failed to remove friend"),
  });

  if (isLoading || !status) {
    return <Button disabled className="rounded-full px-8 bg-gray-100 text-gray-400">Loading...</Button>;
  }

  if (status.isBlocked) {
    return null;
  }

  // Furtail supports friendship and follow as independent relationships —
  // the primary button drives the friend-request lifecycle, and a smaller
  // secondary button (when not already friends) toggles following, so a
  // visitor can follow someone's posts without sending a friend request.
  const followToggle = !status.isFriend && (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full border border-gray-200 text-gray-500 hover:text-purple-700 hover:border-purple-200"
      title={status.isFollowing ? "Unfollow" : "Follow"}
      aria-label={status.isFollowing ? "Unfollow" : "Follow"}
      onClick={() =>
        status.isFollowing ? unfollowMutation.mutate() : followMutation.mutate()
      }
      disabled={followMutation.isPending || unfollowMutation.isPending}
    >
      {status.isFollowing ? <Bell className="w-4 h-4" /> : <BellPlus className="w-4 h-4" />}
    </Button>
  );

  if (status.isFriend) {
    return (
      <div className={wrapClass}>
        <Button
          variant="outline"
          className={cn(primaryClass, "flex items-center justify-center gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800")}
          onClick={() => unfriendMutation.mutate()}
          disabled={unfriendMutation.isPending}
        >
          <UserCheck className="w-4 h-4" />
          {unfriendMutation.isPending ? "Removing..." : "Friends"}
        </Button>
      </div>
    );
  }

  if (status.friendRequestState === "OUTGOING_PENDING") {
    return (
      <div className={wrapClass}>
        <Button
          variant="outline"
          className={cn(primaryClass, "flex items-center justify-center gap-2")}
          onClick={() => status.friendRequestId && cancelRequestMutation.mutate(status.friendRequestId)}
          disabled={cancelRequestMutation.isPending}
        >
          <Clock className="w-4 h-4" />
          {cancelRequestMutation.isPending ? "Canceling..." : "Request Sent"}
        </Button>
        {followToggle}
      </div>
    );
  }

  if (status.friendRequestState === "INCOMING_PENDING") {
    const pendingBtnClass = compact ? primaryClass : "rounded-full px-4";
    return (
      <div className={wrapClass}>
        <Button
          className={cn(pendingBtnClass, "bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-1")}
          onClick={() => status.friendRequestId && acceptRequestMutation.mutate(status.friendRequestId)}
          disabled={acceptRequestMutation.isPending}
        >
          <Check className="w-4 h-4" /> Accept
        </Button>
        <Button
          variant="outline"
          className={cn(pendingBtnClass, "flex items-center justify-center gap-1 text-red-600 border-red-200 hover:bg-red-50")}
          onClick={() => status.friendRequestId && rejectRequestMutation.mutate(status.friendRequestId)}
          disabled={rejectRequestMutation.isPending}
        >
          <X className="w-4 h-4" /> Decline
        </Button>
        {!compact && followToggle}
      </div>
    );
  }

  // Not friends, no pending request either direction.
  return (
    <div className={wrapClass}>
      <Button
        className={cn(primaryClassWide, "bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2")}
        onClick={() => requestFriendMutation.mutate()}
        disabled={requestFriendMutation.isPending}
      >
        <UserPlus className="w-4 h-4" />
        {requestFriendMutation.isPending ? "Sending..." : "Add Friend"}
      </Button>
      {followToggle}
    </div>
  );
}
