"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MapPin, PawPrint } from "lucide-react";
import { adoptionApi, adoptionKeys, type AdoptionListingSummary } from "@/lib/api/adoption";
import { normalizeAuthor } from "@/lib/api/posts";
import { getMediaUrl } from "@/lib/media";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FeedCardShell } from "@/components/feed/feed-card-shell";
import { MediaGrid } from "@/components/feed/media-grid";
import { normalizeMediaList } from "@/lib/media-normalize";
import { CaptionText } from "@/components/feed/caption-text";
import { ClickableRegion } from "@/components/feed/clickable-region";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Renders one `AdoptionListing` (real `/adoption/feed` item, see
 * `adoption-store.ts`'s `serializeListing`) through the same
 * `FeedCardShell` a social post uses — same header/media/actions layout,
 * adoption-specific data and mutations only.
 */
export function AdoptionFeedCard({ listing }: { listing: AdoptionListingSummary }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const openListing = () => router.push(`/adoption/${listing.id}`);
  const owner = normalizeAuthor(listing.owner);
  const ownerDisplayName = listing.ownerName || owner.displayName;
  const ownerAvatarUrl = listing.ownerAvatarUrl || owner.avatarUrl;
  const ownerUserId = String(listing.ownerUserId ?? owner.userId);
  const avatarFallback = (ownerDisplayName || "F").charAt(0).toUpperCase();

  const media = normalizeMediaList(listing.media);

  const favoriteMutation = useMutation({
    mutationFn: () =>
      listing.isFavoritedByMe
        ? adoptionApi.unfavoriteListing(listing.id)
        : adoptionApi.favoriteListing(listing.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adoptionKeys.all });
    },
    onError: () => toast.error("Failed to update favorite"),
  });

  const facts = [listing.species, listing.breed, listing.ageLabel].filter(Boolean).join(" · ");

  return (
    <FeedCardShell
      avatarUrl={getMediaUrl(ownerAvatarUrl || null)}
      avatarFallback={avatarFallback}
      avatarHref={`/profile/${ownerUserId}`}
      title={ownerDisplayName}
      meta={<span>Listed a pet for adoption</span>}
      kindBadge={
        <Badge className="bg-emerald-50 text-emerald-700 border-none rounded-full text-[10px] font-bold px-2 py-0.5">
          <PawPrint className="w-3 h-3 mr-1" /> Adoption
        </Badge>
      }
      body={
        <>
          <ClickableRegion onActivate={openListing} ariaLabel="Open adoption listing">
            <h3 className="font-bold text-gray-950 text-base mb-0.5">{listing.petName || "Unnamed pet"}</h3>
            {facts && <p className="text-sm text-gray-600 font-medium mb-1">{facts}</p>}
            {listing.location && (
              <p className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                <MapPin className="w-3.5 h-3.5 shrink-0" /> {listing.location}
              </p>
            )}
            <CaptionText text={listing.story || listing.description} />
          </ClickableRegion>
          <MediaGrid media={media} onOpen={openListing} />
        </>
      }
      actionsRow={
        <>
          <button
            className={cn(
              "flex items-center gap-1.5 transition-colors cursor-pointer hover:text-purple-600",
              listing.isFavoritedByMe ? "text-purple-600 font-semibold" : ""
            )}
            onClick={() => favoriteMutation.mutate()}
            disabled={favoriteMutation.isPending}
            aria-pressed={Boolean(listing.isFavoritedByMe)}
            aria-label={listing.isFavoritedByMe ? "Unfavorite" : "Favorite"}
          >
            <Heart className={cn("w-4.5 h-4.5", listing.isFavoritedByMe ? "fill-purple-600 text-purple-600" : "")} />
            <span>{listing.isFavoritedByMe ? "Favorited" : "Favorite"}</span>
            {(listing.favoriteCount ?? 0) > 0 && <span className="text-xs">({listing.favoriteCount})</span>}
          </button>
          <Link href={`/adoption/${listing.id}`} className="ml-auto">
            <Button size="sm" className="rounded-full bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-4 h-8 cursor-pointer">
              Meet {listing.petName || "this pet"}
            </Button>
          </Link>
        </>
      }
    />
  );
}
