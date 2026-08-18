"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fundraisingApi, fundraisingKeys } from "@/lib/api/fundraising";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMediaUrl } from "@/lib/media";
import { ArrowLeft, Share2, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [donateAmount, setDonateAmount] = useState("10");

  const { data: campaign, isLoading, isError } = useQuery({
    queryKey: fundraisingKeys.campaign(id),
    queryFn: () => fundraisingApi.getCampaign(id),
  });

  const donateMutation = useMutation({
    mutationFn: (amountMinor: number) =>
      fundraisingApi.createDonationCheckout(id, {
        amount: amountMinor,
        currencyCode: "USD",
        returnUrl: `${window.location.origin}/fundraising/${id}`,
        cancelUrl: `${window.location.origin}/fundraising/${id}`,
        consentAccepted: true,
      }),
    onSuccess: (res) => {
      const redirectUrl = res.payment?.redirectUrl;
      const referenceId = res.donationIntent?.referenceId;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else if (referenceId) {
        router.push(`/fundraising/payment-status?ref=${encodeURIComponent(referenceId)}`);
      } else {
        toast.success("Donation submitted");
      }
    },
    onError: () => {
      toast.error("Failed to process donation. Please try again.");
    }
  });

  const handleDonate = () => {
    const amountMinor = Math.floor(parseFloat(donateAmount) * 100);
    if (isNaN(amountMinor) || amountMinor <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    donateMutation.mutate(amountMinor);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/fundraising/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: campaign?.title });
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="py-6 px-4 max-w-3xl mx-auto space-y-6">
        <Skeleton className="w-full h-80 rounded-3xl" />
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-40" />
      </div>
    );
  }

  if (isError || !campaign) {
    return (
      <div className="py-12 px-4 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Campaign Not Found</h2>
        <p className="text-gray-500 mb-6">The campaign you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => router.push("/fundraising")}>Back to Fundraising</Button>
      </div>
    );
  }

  const progress = ((campaign.raisedMinor || 0) / (campaign.goalMinor || 1)) * 100;
  const image = campaign.coverMedia?.url || campaign.media?.[0]?.url;

  return (
    <div className="pb-20 md:pb-8 bg-white min-h-screen">
      {/* Mobile Header overlay */}
      <div className="absolute top-4 left-4 z-20 md:hidden">
        <Button size="icon" variant="secondary" className="rounded-full bg-white/80 backdrop-blur" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <div className="max-w-4xl mx-auto md:py-6 md:px-4">
        <div className="hidden md:flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Back to Campaigns</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2">
            <div className="aspect-video md:rounded-3xl overflow-hidden bg-gray-100 relative">
              {image ? (
                <img src={getMediaUrl(image)} alt={campaign.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
              )}
            </div>

            <div className="px-4 py-6 md:px-0">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-4">{campaign.title}</h1>
              
              <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-2xl">
                <Avatar className="w-12 h-12 border border-white shadow-sm">
                  <AvatarImage src={getMediaUrl(campaign.owner?.avatarUrl)} />
                  <AvatarFallback>{campaign.owner?.displayName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">{campaign.owner?.displayName || 'Unknown Organizer'}</p>
                  <p className="text-sm text-gray-500">Campaign Organizer</p>
                </div>
                {campaign.owner?.isVerified && (
                  <ShieldCheck className="w-5 h-5 text-purple-600 ml-auto" />
                )}
              </div>

              <div className="prose prose-purple max-w-none">
                <h3 className="text-xl font-bold mb-3">About this campaign</h3>
                <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {campaign.description || campaign.caption || "No description provided."}
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar / Sticky Donate Card */}
          <div className="px-4 md:px-0">
            <div className="sticky top-24 bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 p-6">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-gray-900">${((campaign.raisedMinor || 0) / 100).toLocaleString()}</span>
                  <span className="text-gray-500 font-medium">raised of ${((campaign.goalMinor || 0) / 100).toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
                  <div className="bg-purple-600 h-3 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                </div>
                <p className="text-sm text-gray-500">{campaign.donorsCount || 0} donations</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-medium">$</span>
                  </div>
                  <Input 
                    type="number" 
                    min="1"
                    className="pl-8 h-14 rounded-2xl text-lg font-bold bg-gray-50 border-gray-200"
                    value={donateAmount}
                    onChange={(e) => setDonateAmount(e.target.value)}
                  />
                </div>
                
                <Button 
                  className="w-full h-14 rounded-2xl text-lg font-bold bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-200"
                  onClick={handleDonate}
                  disabled={donateMutation.isPending}
                >
                  {donateMutation.isPending ? "Processing..." : "Donate Now"}
                </Button>

                <Button variant="outline" className="w-full h-12 rounded-2xl font-semibold" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <strong>Furtail Guarantee</strong><br/>
                    Your donation is protected. In the rare case that something isn't right, we will refund your donation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
