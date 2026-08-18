import type { Post } from "@/lib/api/posts";
import type { AdoptionListingSummary as AdoptionFeedListing } from "@/lib/api/adoption";
import type { FundraisingCampaignSummary as FundraisingFeedCampaign } from "@/lib/api/fundraising";

export type { AdoptionFeedListing, FundraisingFeedCampaign };

/**
 * Discriminated union over the 3 real, independently-fetched content
 * sources that make up the Home feed. There is no backend-native "mixed
 * feed" endpoint (`Post`, `AdoptionListing`, `FundraisingCampaign` are
 * separate Prisma models) — see docs/furtail-web-feature-matrix.md — so
 * merging happens here, client-side, over real data from each real feed.
 */
export type FeedItem =
  | { kind: "post"; key: string; post: Post }
  | { kind: "adoption"; key: string; listing: AdoptionFeedListing }
  | { kind: "fundraising"; key: string; campaign: FundraisingFeedCampaign };
