"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartHandshake, Users } from "lucide-react";
import { normalizeAuthor } from "@/lib/api/posts";
import type { FundraisingCampaignSummary } from "@/lib/api/fundraising";
import { getMediaUrl } from "@/lib/media";
import { FeedCardShell } from "@/components/feed/feed-card-shell";
import { MediaGrid } from "@/components/feed/media-grid";
import { normalizeMediaList } from "@/lib/media-normalize";
import { CaptionText } from "@/components/feed/caption-text";
import { ClickableRegion } from "@/components/feed/clickable-region";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

/**
 * Renders one `FundraisingCampaign` (real `/fundraising/feed` item, see
 * `fundraising-store.ts`'s `campaignPayload`) through the shared feed
 * shell. Uses the *actual* payload field names (`stats.raisedAmount`,
 * `targetAmountMinor`, flat `media[]`, real `createdAt`) — the existing
 * standalone `/fundraising` page reads `raisedMinor`/`goalMinor`/
 * `coverMedia`, none of which the backend returns; not fixed here (out of
 * this task's scope) but not repeated in this new card either.
 */
export function FundraisingFeedCard({ campaign }: { campaign: FundraisingCampaignSummary }) {
  const router = useRouter();
  const openCampaign = () => router.push(`/fundraising/${campaign.id}`);
  const author = normalizeAuthor(campaign.author);
  const avatarFallback = (author.displayName || "F").charAt(0).toUpperCase();

  const media = normalizeMediaList(campaign.media);

  const raised = toNumber(campaign.stats?.raisedAmount);
  const target = toNumber(campaign.targetAmountMinor);
  const currency = campaign.currencyCode || "BDT";
  const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
  const donorsCount = toNumber(campaign.stats?.donorsCount);

  const formatAmount = (minor: number) =>
    (minor / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <FeedCardShell
      avatarUrl={getMediaUrl(author.avatarUrl || null)}
      avatarFallback={avatarFallback}
      avatarHref={`/profile/${author.userId}`}
      title={author.displayName}
      meta={<span>Started a fundraiser</span>}
      kindBadge={
        <Badge className="bg-rose-50 text-rose-700 border-none rounded-full text-[10px] font-bold px-2 py-0.5">
          <HeartHandshake className="w-3 h-3 mr-1" /> Fundraiser
        </Badge>
      }
      body={
        <>
          <ClickableRegion onActivate={openCampaign} ariaLabel="Open fundraiser">
            <h3 className="font-bold text-gray-950 text-base mb-1">{campaign.title}</h3>
            <CaptionText text={campaign.caption} />
          </ClickableRegion>
          <MediaGrid media={media} onOpen={openCampaign} />
          <div className="mt-3.5">
            <div className="flex justify-between text-sm mb-1.5 font-medium">
              <span className="text-purple-600">
                {currency} {formatAmount(raised)} raised
              </span>
              {target > 0 && <span className="text-gray-500">of {currency} {formatAmount(target)}</span>}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${progress}%` }} />
            </div>
            {donorsCount > 0 && (
              <p className="flex items-center gap-1 text-xs text-gray-500 mt-1.5">
                <Users className="w-3.5 h-3.5" /> {donorsCount} donor{donorsCount === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </>
      }
      actionsRow={
        <Link href={`/fundraising/${campaign.id}`} className="w-full">
          <Button className="w-full rounded-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold cursor-pointer">
            Donate Now
          </Button>
        </Link>
      }
    />
  );
}
