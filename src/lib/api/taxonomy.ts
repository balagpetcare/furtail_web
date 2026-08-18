import { fetchApi } from "../api-client";

export interface AnimalType {
  id: number;
  name: string;
}

export interface Breed {
  id: number;
  name: string;
  animalTypeId: number;
}

export interface FeelingActivityItem {
  id: string;
  labelEn: string;
  emoji: string;
  category: string;
  type: "FEELING" | "ACTIVITY";
  isPetSpecific?: boolean;
}

export const taxonomyApi = {
  getAnimalTypes: async () => {
    return fetchApi<{ items: AnimalType[] }>("/common/animal-types");
  },

  getBreeds: async (animalTypeId: number) => {
    return fetchApi<{ items: Breed[] }>(`/common/breeds/${animalTypeId}`);
  },

  getFeelingActivities: async (params?: {
    type?: "FEELING" | "ACTIVITY";
    q?: string;
  }) => {
    return fetchApi<{ data: FeelingActivityItem[] }>("/feeling-activities", {
      params,
    });
  },
};
