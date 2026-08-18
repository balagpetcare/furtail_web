"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { adoptionApi, adoptionKeys } from "@/lib/api/adoption";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMediaUrl } from "@/lib/media";
import { ArrowLeft, MapPin, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function AdoptionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [applicationNote, setApplicationNote] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");

  const { data: pet, isLoading, isError } = useQuery({
    queryKey: adoptionKeys.listing(id),
    queryFn: () => adoptionApi.getListing(id),
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      adoptionApi.applyForAdoption(id, {
        messageToOwner: applicationNote,
        applicantName,
        applicantPhone,
      }),
    onSuccess: () => {
      toast.success("Application submitted successfully!");
      setIsApplyOpen(false);
    },
    onError: () => {
      toast.error("Failed to submit application. Please try again.");
    }
  });

  const handleApply = () => {
    applyMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="py-6 px-4 max-w-4xl mx-auto space-y-6">
        <Skeleton className="w-full h-96 rounded-3xl" />
        <Skeleton className="w-64 h-10" />
        <Skeleton className="w-full h-40" />
      </div>
    );
  }

  if (isError || !pet) {
    return (
      <div className="py-12 px-4 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Pet Not Found</h2>
        <p className="text-gray-500 mb-6">The pet you're looking for doesn't exist or is no longer available.</p>
        <Button onClick={() => router.push("/adoption")}>Back to Adoption Center</Button>
      </div>
    );
  }

  const image = pet.media?.[0]?.url;

  const handleShare = async () => {
    const url = `${window.location.origin}/adoption/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: pet.name });
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };
  
  return (
    <div className="pb-20 md:pb-8 bg-white min-h-screen">
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
          <h1 className="text-xl font-bold">Back to Adoption</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square md:rounded-3xl overflow-hidden bg-gray-100 relative">
            {image ? (
              <img src={getMediaUrl(image)} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
            )}
            
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="rounded-full bg-white/80 backdrop-blur text-gray-600 hover:text-blue-500"
                onClick={handleShare}
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="px-4 py-2 md:px-0 flex flex-col">
            <div className="mb-6 border-b border-gray-100 pb-6">
              <div className="flex justify-between items-start mb-2">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{pet.name}</h1>
                {pet.status === 'ADOPTED' && (
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Adopted</span>
                )}
                {pet.status === 'PUBLISHED' && (
                  <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Available</span>
                )}
              </div>
              
              <p className="text-lg text-gray-600 capitalize mb-4">
                {pet.animalBreed || pet.animalType || 'Unknown breed'}
              </p>
              
              <div className="flex items-center gap-2 text-gray-500 mb-4">
                <MapPin className="w-4 h-4" />
                <span>{pet.formattedAddress || 'Location unverified'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 p-3 rounded-2xl text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Age</p>
                <p className="font-bold text-gray-900">{pet.approximateAge || 'Unknown'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Sex</p>
                <p className="font-bold text-gray-900 capitalize">{pet.gender?.toLowerCase() || 'Unknown'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Size</p>
                <p className="font-bold text-gray-900 capitalize">{pet.size?.toLowerCase() || 'Unknown'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Color</p>
                <p className="font-bold text-gray-900 capitalize">{pet.color?.toLowerCase() || 'Unknown'}</p>
              </div>
            </div>

            <div className="prose prose-purple max-w-none mb-8">
              <h3 className="text-xl font-bold mb-3">About {pet.name}</h3>
              <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {pet.story || pet.description || "No description provided."}
              </p>
            </div>
            
            <div className="mt-auto">
              <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
                <DialogTrigger className="w-full h-14 rounded-2xl text-lg font-bold bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-200 text-white flex items-center justify-center disabled:opacity-50" disabled={pet.status === 'ADOPTED' || pet.status === 'ARCHIVED'}>
                  Apply to Adopt {pet.name}
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-3xl p-6">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Adopt {pet.name}</DialogTitle>
                    <DialogDescription className="text-gray-500 pt-2 text-[15px]">
                      Send an application to the owner. They will review your profile and get in touch with you.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        className="rounded-xl bg-gray-50 border border-gray-200 h-11 px-3 text-[15px]"
                        placeholder="Your name"
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                      />
                      <input
                        className="rounded-xl bg-gray-50 border border-gray-200 h-11 px-3 text-[15px]"
                        placeholder="Phone number"
                        value={applicantPhone}
                        onChange={(e) => setApplicantPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-900 mb-2 block">Why would you be a good fit?</label>
                      <Textarea
                        className="resize-none rounded-xl bg-gray-50 border-gray-200 h-32 text-[15px]"
                        placeholder="Tell the owner about your home, experience with pets, and why you want to adopt..."
                        value={applicationNote}
                        onChange={(e) => setApplicationNote(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full h-12 rounded-xl text-[15px] font-bold bg-gray-900 hover:bg-gray-800 text-white"
                    onClick={handleApply}
                    disabled={applyMutation.isPending || !applicantName.trim() || !applicantPhone.trim()}
                  >
                    {applyMutation.isPending ? "Submitting..." : "Submit Application"}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
