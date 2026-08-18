"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { petsApi, petsKeys } from "@/lib/api/pets";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Stethoscope, Syringe, Heart, Share2, Activity } from "lucide-react";
import Link from "next/link";
import { getMediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function PetProfilePage() {
  const params = useParams();
  const petId = params.id as string;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("about");

  const { data: petData, isLoading: petLoading } = useQuery({
    queryKey: petsKeys.detail(petId),
    queryFn: () => petsApi.getPet(petId),
    enabled: !!petId,
  });

  const { data: medicalHistoryData, isLoading: medicalLoading } = useQuery({
    queryKey: petsKeys.medicalHistory(petId),
    queryFn: () => petsApi.getMedicalHistory(petId),
    enabled: !!petId && activeTab === "medical",
  });

  const { data: vaccinationsData, isLoading: vaccinationsLoading } = useQuery({
    queryKey: petsKeys.vaccinations(petId),
    queryFn: () => petsApi.getVaccinations(petId),
    enabled: !!petId && activeTab === "vaccinations",
  });

  const likeMutation = useMutation({
    mutationFn: () => petsApi.likePet(petId),
    onSuccess: () => toast.success("Liked!"),
    onError: () => toast.error("Failed to like"),
  });

  const followMutation = useMutation({
    mutationFn: () => petsApi.followPet(petId),
    onSuccess: () => toast.success("Following!"),
    onError: () => toast.error("Failed to follow"),
  });

  if (petLoading) {
    return (
      <div className="py-6 px-4 sm:px-0 max-w-4xl mx-auto space-y-6">
        <Skeleton className="w-full h-80 rounded-3xl" />
        <Skeleton className="w-full h-40 rounded-3xl" />
      </div>
    );
  }

  const pet: any = (petData as any)?.item || petData;
  if (!pet) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-bold mb-2">Pet not found</h2>
        <Button onClick={() => router.push("/profile")}>Go Back</Button>
      </div>
    );
  }

  const isOwner = pet.isOwnedByViewer || pet.ownerId === "1"; // Fallback to 1 for mock
  const coverImage = pet.coverMedia?.url || pet.media?.[0]?.url;

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
          <h1 className="text-xl font-bold">Back</h1>
        </div>

        {/* Header Cover */}
        <div className="aspect-[3/1] md:rounded-3xl overflow-hidden bg-gray-100 relative mb-20 md:mb-24 shadow-sm border border-gray-100">
          {coverImage ? (
            <img src={getMediaUrl(coverImage)} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-purple-100 to-pink-100" />
          )}
          
          <div className="absolute -bottom-16 md:-bottom-20 left-6 md:left-10 flex items-end gap-4">
            <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-white shadow-lg bg-white">
              <AvatarImage src={getMediaUrl(pet.avatarUrl)} className="object-cover" />
              <AvatarFallback className="text-4xl">{pet.name?.[0] || 'P'}</AvatarFallback>
            </Avatar>
          </div>
          
          <div className="absolute top-4 right-4 flex gap-2">
            {!isOwner && (
              <>
                <Button size="icon" variant="secondary" className="rounded-full bg-white/80 backdrop-blur" onClick={() => likeMutation.mutate()}>
                  <Heart className="w-5 h-5 text-gray-600 hover:text-red-500" />
                </Button>
                <Button className="rounded-full bg-white/80 backdrop-blur text-gray-900 hover:bg-white" onClick={() => followMutation.mutate()}>
                  Follow
                </Button>
              </>
            )}
            {isOwner && (
              <Link href={`/pet/${pet.id}/edit`}>
                <Button size="icon" variant="secondary" className="rounded-full bg-white/80 backdrop-blur">
                  <Edit className="w-5 h-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="px-6 md:px-10 mb-8 mt-16 md:mt-24">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{pet.name}</h1>
          <p className="text-lg text-gray-500 capitalize">{pet.animalBreed || pet.species} • {pet.approximateAge || `${pet.age} years old`}</p>
        </div>

        <div className="px-4 md:px-0">
          <Tabs defaultValue="about" onValueChange={setActiveTab}>
            <TabsList className="bg-gray-50 p-1 rounded-2xl w-full flex mb-6 h-12">
              <TabsTrigger value="about" className="flex-1 rounded-xl text-sm font-semibold">About</TabsTrigger>
              <TabsTrigger value="medical" className="flex-1 rounded-xl text-sm font-semibold">Medical</TabsTrigger>
              <TabsTrigger value="vaccinations" className="flex-1 rounded-xl text-sm font-semibold">Vaccinations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="about" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-3xl text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Sex</p>
                  <p className="font-bold text-gray-900 capitalize">{pet.gender?.toLowerCase() || 'Unknown'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-3xl text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Size</p>
                  <p className="font-bold text-gray-900 capitalize">{pet.size?.toLowerCase() || 'Unknown'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-3xl text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Color</p>
                  <p className="font-bold text-gray-900 capitalize">{pet.color?.toLowerCase() || 'Unknown'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-3xl text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Weight</p>
                  <p className="font-bold text-gray-900">{pet.weight ? `${pet.weight} ${pet.weightUnit || 'kg'}` : 'Unknown'}</p>
                </div>
              </div>

              <div className="prose prose-purple max-w-none bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-xl font-bold mb-3 mt-0">Story</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {pet.bio || pet.story || "No bio provided."}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="medical">
              <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                  <div className="bg-blue-100 p-2 rounded-xl">
                    <Stethoscope className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold m-0">Medical History</h3>
                </div>
                <CardContent className="p-0">
                  {medicalLoading ? (
                    <div className="p-6 space-y-4">
                      <Skeleton className="w-full h-16 rounded-2xl" />
                      <Skeleton className="w-full h-16 rounded-2xl" />
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {medicalHistoryData?.medicalHistory?.length ? (
                        medicalHistoryData.medicalHistory.map((record: any, i: number) => (
                          <div key={i} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-gray-900">{record.condition || record.title}</h4>
                              <span className="text-sm text-gray-500">{record.date && new Date(record.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">{record.notes || record.description}</p>
                            {record.veterinarian && (
                              <p className="text-xs font-medium text-gray-500">Vet: {record.veterinarian}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center text-gray-500">
                          <Activity className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                          <p>No medical records found.</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vaccinations">
              <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                  <div className="bg-green-100 p-2 rounded-xl">
                    <Syringe className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold m-0">Vaccinations</h3>
                </div>
                <CardContent className="p-0">
                  {vaccinationsLoading ? (
                    <div className="p-6 space-y-4">
                      <Skeleton className="w-full h-16 rounded-2xl" />
                      <Skeleton className="w-full h-16 rounded-2xl" />
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {((vaccinationsData as any)?.items?.length || (vaccinationsData as any)?.vaccinations?.length) ? (
                        ((vaccinationsData as any)?.items || (vaccinationsData as any)?.vaccinations || []).map((vax: any, i: number) => (
                          <div key={i} className="p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
                            <div>
                              <h4 className="font-bold text-gray-900">{vax.name || vax.vaccineName}</h4>
                              <p className="text-sm text-gray-500">Administered: {vax.dateAdministered ? new Date(vax.dateAdministered).toLocaleDateString() : 'Unknown'}</p>
                            </div>
                            {vax.nextDueDate && (
                              <div className="text-right">
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Next Due</p>
                                <p className="font-bold text-purple-600">{new Date(vax.nextDueDate).toLocaleDateString()}</p>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center text-gray-500">
                          <Syringe className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                          <p>No vaccination records found.</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
