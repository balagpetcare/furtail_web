"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { petsApi } from "@/lib/api/pets";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";

export default function AddPetPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createPetMutation = useMutation({
    mutationFn: (data: any) => petsApi.createPet(data),
    onSuccess: () => {
      toast.success("Pet profile created!");
      queryClient.invalidateQueries({ queryKey: ["pets", "me"] });
      router.push("/profile");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create pet profile");
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
    
    createPetMutation.mutate(petData);
  };

  return (
    <div className="py-6 px-4 sm:px-0 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/profile" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Add a Pet</h1>
      </div>

      <Card className="p-6 rounded-2xl border border-gray-100 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Pet Name</Label>
            <Input id="name" name="name" placeholder="Bella" className="rounded-xl" required />
          </div>

          <div className="space-y-2">
            <Label>Species</Label>
            <Select name="species" required>
              <SelectTrigger className="w-full rounded-xl border-gray-200 focus:ring-purple-200">
                <SelectValue placeholder="Select species" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dog">Dog</SelectItem>
                <SelectItem value="cat">Cat</SelectItem>
                <SelectItem value="bird">Bird</SelectItem>
                <SelectItem value="reptile">Reptile</SelectItem>
                <SelectItem value="small_pet">Small Pet (Rabbit, Hamster)</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="breed">Breed (Optional)</Label>
            <Input id="breed" name="breed" placeholder="Golden Retriever" className="rounded-xl" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Age (Years)</Label>
            <Input id="age" name="age" type="number" min="0" max="50" placeholder="3" className="rounded-xl" />
          </div>

          <div className="pt-4 border-t border-gray-50 flex justify-end">
            <Button type="submit" className="w-full rounded-xl py-6 text-lg bg-purple-600 hover:bg-purple-700" disabled={createPetMutation.isPending}>
              {createPetMutation.isPending ? "Creating..." : "Complete Profile"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
