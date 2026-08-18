import type { Post } from "@/lib/api/posts";
import type { AdoptionFeedListing, FeedItem, FundraisingFeedCampaign } from "./types";

/**
 * Interleaves the 3 real feeds into one list. Posts are recency-ordered
 * (real `createdAt`) and form the backbone; adoption listings have no
 * `createdAt` in the backend payload at all (see adoption-store.ts's
 * `serializeListing` — genuinely absent, not a client bug) so they can't
 * be true-sorted against posts, and are instead inserted at a fixed
 * cadence (every `adoptionEvery` posts) in the order the real
 * `/adoption/feed` endpoint already returned them. Fundraising campaigns
 * do have a real `createdAt`, but are still cadence-inserted rather than
 * globally re-sorted, to avoid two donation asks landing back-to-back.
 * This is an honest client-side interleave, not a fabricated ranking.
 */
export function buildMixedFeed(
  posts: Post[],
  adoptionListings: AdoptionFeedListing[],
  fundraisingCampaigns: FundraisingFeedCampaign[],
  options: { adoptionEvery?: number; fundraisingEvery?: number } = {},
): FeedItem[] {
  const adoptionEvery = options.adoptionEvery ?? 6;
  const fundraisingEvery = options.fundraisingEvery ?? 5;

  const result: FeedItem[] = [];
  let adoptionIndex = 0;
  let fundraisingIndex = 0;

  posts.forEach((post, i) => {
    result.push({ kind: "post", key: `post-${post.id}`, post });

    const slot = i + 1;
    if (slot % fundraisingEvery === 0 && fundraisingIndex < fundraisingCampaigns.length) {
      const campaign = fundraisingCampaigns[fundraisingIndex++];
      result.push({ kind: "fundraising", key: `fundraising-${campaign.id}`, campaign });
    }
    if (slot % adoptionEvery === 0 && adoptionIndex < adoptionListings.length) {
      const listing = adoptionListings[adoptionIndex++];
      result.push({ kind: "adoption", key: `adoption-${listing.id}`, listing });
    }
  });

  // Anything left over (short post pages, or more inserts than posts) still
  // gets shown rather than silently dropped.
  for (; fundraisingIndex < fundraisingCampaigns.length; fundraisingIndex++) {
    const campaign = fundraisingCampaigns[fundraisingIndex];
    result.push({ kind: "fundraising", key: `fundraising-${campaign.id}`, campaign });
  }
  for (; adoptionIndex < adoptionListings.length; adoptionIndex++) {
    const listing = adoptionListings[adoptionIndex];
    result.push({ kind: "adoption", key: `adoption-${listing.id}`, listing });
  }

  return result;
}
