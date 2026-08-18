"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { socialApi, socialKeys } from "@/lib/api/social";
import { toast } from "sonner";

/**
 * Single source of truth for "People You May Know" data — shared by
 * `RightSidebar`'s vertical list and Home's horizontal rail so the
 * suggestion query and dismiss mutation aren't duplicated in both places.
 */
export function useSuggestions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: socialKeys.suggestions(),
    queryFn: () => socialApi.getSuggestions(),
  });

  const dismissMutation = useMutation({
    mutationFn: (userId: string) => socialApi.dismissSuggestion(userId),
    onSuccess: (_data, userId) => {
      queryClient.setQueryData(socialKeys.suggestions(), (old: Awaited<ReturnType<typeof socialApi.getSuggestions>> | undefined) =>
        old ? { ...old, items: old.items.filter((u) => u.userId !== userId) } : old
      );
    },
    onError: () => toast.error("Failed to dismiss suggestion"),
  });

  return {
    suggestions: query.data?.items ?? [],
    isLoading: query.isLoading,
    error: query.error,
    dismiss: dismissMutation.mutate,
    isDismissing: dismissMutation.isPending,
  };
}
