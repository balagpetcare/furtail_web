"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { petsApi } from "@/lib/api/pets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditPetPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const petId = params.id as string;

  const { data: petDataResponse, isLoading: isFetching } = useQuery({
    queryKey: ["pets", petId],
    queryFn: () => petsApi.getPet(petId),
  });

  const pet = petDataResponse?.item;

  const updatePetMutation = useMutation({
    mutationFn: (data: any) => petsApi.updatePet(petId, data),
    onSuccess: () => {
      toast.success("Pet profile updated!");
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      router.push(`/pet/${petId}`);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update pet profile");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const petData = {
      name: formData.get("name") as string,
      species: formData.get("species") as string,
      breed: formData.get("breed") as string,
      age: formData.get("age") ? Number(formData.get("age")) : undefined,
    };
    
    updatePetMutation.mutate(petData);
  };

  if (isFetching) return <Skeleton className="w-full h-64 rounded-2xl m-6" />;
  if (!pet) return <div className="p-8 text-center text-gray-500">Pet not found</div>;

  return (
    <div className="py-6 px-4 sm:px-0 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/pet/${petId}`} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Edit Pet</h1>
      </div>

      <Card className="p-6 rounded-2xl border border-gray-100 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Pet Name</Label>
            <Input id="name" name="name" defaultValue={pet?.name} className="rounded-xl" required />
          </div>

          <div className="space-y-2">
            <Label>Species</Label>
            <Select name="species" required defaultValue={pet?.species}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select species" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dog">Dog</SelectItem>
                <SelectItem value="cat">Cat</SelectItem>
                <SelectItem value="bird">Bird</SelectItem>
                <SelectItem value="reptile">Reptile</SelectItem>
                <SelectItem value="small_pet">Small Pet</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="breed">Breed</Label>
            <Input id="breed" name="breed" defaultValue={pet?.breed} className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Age (Years)</Label>
            <Input id="age" name="age" type="number" min="0" max="50" defaultValue={pet?.age} className="rounded-xl" />
          </div>

          <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
            <Button type="button" variant="destructive" className="rounded-full px-6 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700">
              Delete Pet
            </Button>
            <Button type="submit" className="w-full rounded-xl py-6 text-lg bg-purple-600 hover:bg-purple-700" disabled={updatePetMutation.isPending}>
              {updatePetMutation.isPending ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
