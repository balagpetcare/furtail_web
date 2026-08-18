import { fetchApi } from "../api-client";

export const petsKeys = {
  all: ["pets"] as const,
  myPets: () => [...petsKeys.all, "me"] as const,
  detail: (id: string | number) => [...petsKeys.all, "detail", id] as const,
  profile: (id: string | number) => [...petsKeys.all, "profile", id] as const,
  medicalHistory: (id: string | number) => [...petsKeys.all, "medicalHistory", id] as const,
  vaccinations: (id: string | number) => [...petsKeys.all, "vaccinations", id] as const,
};

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  avatarUrl?: string;
  ownerId: string;
  [key: string]: any;
}

export const petsApi = {
  getMyPets: async () => {
    return fetchApi<{ items: Pet[] }>("/me/pets");
  },

  getPetsByOwner: async (userId: string | number) => {
    return fetchApi<{ items: Pet[] }>(`/users/${userId}/pets`);
  },

  getPet: async (id: string | number) => {
    return fetchApi<{ item: Pet }>(`/pets/${id}`);
  },

  createPet: async (data: Partial<Pet>) => {
    return fetchApi<{ item: Pet }>("/me/pets/register", {
      method: "POST",
      body: data,
    });
  },

  updatePet: async (id: string | number, data: Partial<Pet>) => {
    return fetchApi<{ item: Pet }>(`/me/pets/${id}`, {
      method: "PATCH",
      body: data,
    });
  },
  
  getProfile: async (id: string | number) => {
    return fetchApi<any>(`/user/pets/${id}/profile`);
  },

  getMedicalHistory: async (id: string | number) => {
    return fetchApi<any>(`/user/pets/${id}/medical-history`);
  },

  getVaccinations: async (id: string | number) => {
    return fetchApi<{ items: any[] }>(`/user/pets/${id}/vaccinations`);
  },
  
  followPet: async (id: string | number) => {
    return fetchApi<any>(`/pets/${id}/follow`, { method: "POST" });
  },
  
  unfollowPet: async (id: string | number) => {
    return fetchApi<any>(`/pets/${id}/follow`, { method: "DELETE" });
  },

  likePet: async (id: string | number) => {
    return fetchApi<any>(`/pets/${id}/like`, { method: "POST" });
  },
  
  unlikePet: async (id: string | number) => {
    return fetchApi<any>(`/pets/${id}/like`, { method: "DELETE" });
  },
};
