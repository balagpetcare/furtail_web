"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adoptionApi, adoptionKeys } from "@/lib/api/adoption";
import { taxonomyApi } from "@/lib/api/taxonomy";
import { ApiError } from "@/lib/api-error";

export default function CreateAdoptionListingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [animalTypeId, setAnimalTypeId] = useState<string>("");

  const { data: animalTypes } = useQuery({
    queryKey: ["taxonomy", "animal-types"],
    queryFn: taxonomyApi.getAnimalTypes,
  });

  const { data: breeds } = useQuery({
    queryKey: ["taxonomy", "breeds", animalTypeId],
    queryFn: () => taxonomyApi.getBreeds(Number(animalTypeId)),
    enabled: !!animalTypeId,
  });

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const draft = await adoptionApi.createDraft({
        petName: String(formData.get("petName") || ""),
        animalTypeId: Number(formData.get("animalTypeId")),
        breedId: Number(formData.get("breedId")),
        story: String(formData.get("story") || ""),
        approximateAge: String(formData.get("approximateAge") || "") || undefined,
        gender: String(formData.get("gender") || "") || undefined,
      });
      return adoptionApi.publishListing(draft.id);
    },
    onSuccess: (listing) => {
      toast.success("Listing published!");
      queryClient.invalidateQueries({ queryKey: adoptionKeys.my() });
      router.push(`/adoption/${listing.id}`);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Failed to publish listing");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!formData.get("animalTypeId") || !formData.get("breedId")) {
      toast.error("Select a species and breed");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="py-6 px-4 sm:px-0 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/adoption" className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">List a Pet for Adoption</h1>
      </div>

      <Card className="p-6 rounded-3xl border border-gray-100 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="petName">Pet Name</Label>
            <Input id="petName" name="petName" required placeholder="Bella" className="rounded-xl h-12" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="animalTypeId">Species</Label>
              <Select
                name="animalTypeId"
                required
                onValueChange={(v: unknown) => setAnimalTypeId(v ? String(v) : "")}
              >
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Select species" />
                </SelectTrigger>
                <SelectContent>
                  {animalTypes?.items.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="breedId">Breed</Label>
              <Select name="breedId" required disabled={!animalTypeId}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder={animalTypeId ? "Select breed" : "Choose species first"} />
                </SelectTrigger>
                <SelectContent>
                  {breeds?.items.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="approximateAge">Approximate Age</Label>
              <Input id="approximateAge" name="approximateAge" placeholder="2 years" className="rounded-xl h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Sex</Label>
              <Select name="gender">
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="UNKNOWN">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="story">Story</Label>
            <Textarea
              id="story"
              name="story"
              placeholder="Tell potential adopters about this pet's personality, history, and needs..."
              className="rounded-xl min-h-[140px] resize-none"
            />
          </div>

          <p className="text-xs text-gray-500">
            You can add photos and more details after publishing.
          </p>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <Button
              type="submit"
              className="px-8 h-12 rounded-full bg-purple-600 hover:bg-purple-700 font-semibold"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Publishing..." : "Publish Listing"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
