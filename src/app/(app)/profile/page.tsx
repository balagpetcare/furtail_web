"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { authApi, authKeys } from "@/lib/api/auth";

export default function CurrentUserProfileRedirect() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.getMe,
  });

  useEffect(() => {
    if (!isLoading) {
      if (data?.id) {
        router.replace(`/profile/${data.id}`);
      } else {
        // Fallback if unable to fetch current user ID
        router.replace("/login");
      }
    }
  }, [data, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  );
}
