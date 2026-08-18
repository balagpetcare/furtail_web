"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Info, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { adoptionApi, adoptionKeys } from "@/lib/api/adoption";
import { Skeleton } from "@/components/ui/skeleton";
import { getMediaUrl } from "@/lib/media";
import Link from "next/link";
import { Input } from "@/components/ui/input";

export default function AdoptionPage() {
  const [species, setSpecies] = useState("");
  
  const { data, isLoading, isError } = useQuery({
    queryKey: adoptionKeys.feed({ species }),
    queryFn: () => adoptionApi.getFeed({ species: species || undefined }),
  });

  const petsForAdoption = data?.items || [];

  return (
    <div className="py-6 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Adoption Center</h1>
          <p className="text-gray-500 text-sm mt-1">Find your new best friend.</p>
        </div>
        <div className="flex gap-2">
          <select 
            className="bg-white border border-gray-200 text-sm rounded-full px-4 py-2 outline-none focus:border-purple-300"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
          >
            <option value="">All Species</option>
            <option value="DOG">Dogs</option>
            <option value="CAT">Cats</option>
          </select>
          <Link href="/adoption/my">
            <Button variant="outline" className="rounded-full">My Listings</Button>
          </Link>
          <Link href="/adoption/create">
            <Button className="rounded-full bg-purple-600 hover:bg-purple-700">List a Pet</Button>
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="w-full h-72 rounded-3xl" />
          <Skeleton className="w-full h-72 rounded-3xl" />
          <Skeleton className="w-full h-72 rounded-3xl" />
          <Skeleton className="w-full h-72 rounded-3xl" />
        </div>
      )}

      {isError && (
        <div className="py-12 text-center text-red-500 bg-red-50 rounded-3xl">
          Failed to load adoption listings.
        </div>
      )}

      {!isLoading && !isError && petsForAdoption.length === 0 && (
        <div className="py-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-100 shadow-sm">
          No pets are currently available for adoption.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {petsForAdoption.map((pet: any) => {
          const image = pet.media?.[0]?.url;
          return (
            <Card key={pet.id} className="overflow-hidden rounded-3xl border border-gray-100 shadow-sm flex flex-col group relative">
              <Link href={`/adoption/${pet.id}`} className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-1.5 rounded-full z-10 text-gray-500 hover:text-purple-600 transition-colors cursor-pointer shadow-sm">
                <Info className="w-4 h-4" />
              </Link>
              <div className="h-48 overflow-hidden bg-gray-100">
                {image ? (
                  <img src={getMediaUrl(image)} alt={pet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-lg text-gray-900">{pet.name || 'Unnamed Pet'}</h3>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{pet.approximateAge || 'Age unknown'}</span>
                </div>
                <p className="text-sm text-gray-600 font-medium capitalize">{(pet.animalBreed || pet.animalType || '').toLowerCase()}</p>
                
                <div className="mt-4 flex items-start gap-1.5 text-xs text-gray-500 mb-4">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{pet.formattedAddress || 'Location unknown'}</span>
                </div>

                <div className="mt-auto pt-3 border-t border-gray-50">
                  <Link href={`/adoption/${pet.id}`}>
                    <Button className="w-full rounded-xl bg-gray-900 hover:bg-gray-800 text-white shadow-none">Meet {pet.name}</Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
