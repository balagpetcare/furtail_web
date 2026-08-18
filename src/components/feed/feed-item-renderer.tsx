"use client";

import React from "react";
import type { FeedItem } from "@/lib/feed/types";
import { PostCard } from "@/components/post/post-card";
import { AdoptionFeedCard } from "@/components/feed/adoption-feed-card";
import { FundraisingFeedCard } from "@/components/feed/fundraising-feed-card";

/**
 * Discriminated dispatcher — the only place that switches on `item.kind`.
 * Each card now owns its own navigation (real pages: `/post/[id]`,
 * `/adoption/[id]`, `/fundraising/[id]`) and, for posts, its own Comment
 * popup — no shared "open detail" callback needed here anymore.
 */
export function FeedItemRenderer({ item }: { item: FeedItem }) {
  switch (item.kind) {
    case "post":
      return <PostCard post={item.post} />;
    case "adoption":
      return <AdoptionFeedCard listing={item.listing} />;
    case "fundraising":
      return <FundraisingFeedCard campaign={item.campaign} />;
  }
}
