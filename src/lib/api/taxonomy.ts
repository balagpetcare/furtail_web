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

export const taxonomyApi = {
  getAnimalTypes: async () => {
    return fetchApi<{ items: AnimalType[] }>("/common/animal-types");
  },

  getBreeds: async (animalTypeId: number) => {
    return fetchApi<{ items: Breed[] }>(`/common/breeds/${animalTypeId}`);
  },
};
