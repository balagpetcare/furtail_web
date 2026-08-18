"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from "lucide-react";
import { getMediaUrl } from "@/lib/media";
import { authKeys, authApi } from "@/lib/api/auth";
import { CreatePostModal } from "./create-post-modal";

export function PostComposer() {
  const [modalOpen, setModalOpen] = useState(false);

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: authKeys.me,
    queryFn: () => authApi.getMe(),
  });

  const displayName = user?.profile.displayName;
  const avatarUrl = user?.profile.avatarMedia?.url ?? null;
  const fallbackInitial = displayName ? displayName.charAt(0).toUpperCase() : "U";

  return (
    <>
      <Card 
        onClick={() => setModalOpen(true)}
        className="p-4 mb-6 rounded-2xl border border-gray-100/90 shadow-sm bg-white hover:shadow-md hover:border-gray-200/50 transition-all duration-200 cursor-pointer flex flex-col gap-3"
      >
        <div className="flex gap-3 items-center">
          {isUserLoading ? (
            <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse border border-gray-50 shrink-0" />
          ) : (
            <Avatar className="w-10 h-10 border border-gray-100/85 shrink-0">
              <AvatarImage src={getMediaUrl(avatarUrl)} alt="Your Avatar" />
              <AvatarFallback className="bg-purple-50 text-purple-700 font-semibold">{fallbackInitial}</AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 bg-gray-50/70 hover:bg-gray-50 rounded-full px-4 py-2.5 text-[14px] text-gray-400 font-medium select-none transition-colors border border-gray-100/50">
            What&apos;s on your mind?
          </div>
        </div>

        <div className="border-t border-gray-50 pt-2 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-full text-xs font-semibold px-4 py-1.5 cursor-pointer flex items-center gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Photo / Video</span>
          </Button>
        </div>
      </Card>

      <CreatePostModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
