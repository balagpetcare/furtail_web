"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adoptionApi, adoptionKeys } from "@/lib/api/adoption";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMediaUrl } from "@/lib/media";
import { toast } from "sonner";

function ApplicationsPanel({ listingId }: { listingId: number }) {
  const queryClient = useQueryClient();
  const { data: applications, isLoading } = useQuery({
    queryKey: adoptionKeys.applications(listingId),
    queryFn: () => adoptionApi.getListingApplications(listingId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: number; status: string }) =>
      adoptionApi.updateApplicationStatus(applicationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adoptionKeys.applications(listingId) });
      toast.success("Application updated");
    },
    onError: () => toast.error("Failed to update application"),
  });

  if (isLoading) return <Skeleton className="w-full h-16 rounded-xl" />;
  if (!applications?.length) {
    return <p className="text-sm text-gray-500 py-4">No applications yet.</p>;
  }

  return (
    <div className="space-y-3 py-3">
      {applications.map((app: any) => (
        <div key={app.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={getMediaUrl(app.applicant?.avatarUrl)} />
            <AvatarFallback>{app.applicant?.displayName?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">
              {app.applicantName || app.applicant?.displayName || 'Applicant'}
            </p>
            <p className="text-xs text-gray-500 truncate">{app.messageToOwner || 'No message provided'}</p>
            <p className="text-xs font-medium text-purple-600 mt-1">{app.status}</p>
          </div>
          {app.status !== 'APPROVED' && app.status !== 'REJECTED' && (
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => statusMutation.mutate({ applicationId: app.id, status: 'APPROVED' })}
                disabled={statusMutation.isPending}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full text-red-600 border-red-200"
                onClick={() => statusMutation.mutate({ applicationId: app.id, status: 'REJECTED' })}
                disabled={statusMutation.isPending}
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function MyAdoptionListingsPage() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: listings, isLoading, error } = useQuery({
    queryKey: adoptionKeys.my(),
    queryFn: adoptionApi.getMyListings,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adoptionApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adoptionKeys.my() });
      toast.success("Listing updated");
    },
    onError: () => toast.error("Failed to update listing"),
  });

  return (
    <div className="py-6 px-4 sm:px-0 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/adoption" className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Listings</h1>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="w-full h-24 rounded-2xl" />
          <Skeleton className="w-full h-24 rounded-2xl" />
        </div>
      )}

      {error && (
        <div className="p-6 bg-red-50 text-red-600 rounded-2xl text-center">
          Failed to load your listings.
        </div>
      )}

      {!isLoading && !error && (!listings || listings.length === 0) && (
        <div className="p-12 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl">
          You haven&apos;t listed any pets for adoption yet.
        </div>
      )}

      <div className="space-y-4">
        {listings?.map((listing: any) => {
          const isExpanded = expandedId === listing.id;
          const image = listing.media?.[0]?.url;
          return (
            <Card key={listing.id} className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {image && <img src={getMediaUrl(image)} alt={listing.petName} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{listing.petName}</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {listing.status}
                  </span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {listing.status === 'PUBLISHED' && (
                    <>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => statusMutation.mutate({ id: listing.id, status: 'PAUSED' })}>
                        Pause
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => statusMutation.mutate({ id: listing.id, status: 'ADOPTED' })}>
                        Mark Adopted
                      </Button>
                    </>
                  )}
                  {listing.status === 'PAUSED' && (
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => statusMutation.mutate({ id: listing.id, status: 'PUBLISHED' })}>
                      Resume
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedId(isExpanded ? null : listing.id)}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 pt-3">Applications</h4>
                  <ApplicationsPanel listingId={listing.id} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
