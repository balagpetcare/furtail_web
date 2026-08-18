import { fetchApi } from "../api-client";

export const adoptionKeys = {
  all: ["adoption"] as const,
  feed: (params: any) => [...adoptionKeys.all, "feed", params] as const,
  listing: (id: string | number) => [...adoptionKeys.all, "listing", id] as const,
  applications: (id: string | number) => [...adoptionKeys.all, "listing", id, "applications"] as const,
  my: () => [...adoptionKeys.all, "my"] as const,
  myApplications: () => [...adoptionKeys.all, "myApplications"] as const,
};

/** Matches `serializeListing` in adoption-store.ts — fields this app actually reads, not the full backend payload. */
export interface AdoptionListingSummary {
  id: number | string;
  petName?: string | null;
  species?: string | null;
  breed?: string | null;
  ageLabel?: string | null;
  location?: string | null;
  story?: string | null;
  description?: string | null;
  favoriteCount?: number;
  isFavoritedByMe?: boolean;
  ownerUserId?: number | string;
  ownerName?: string | null;
  ownerAvatarUrl?: string | null;
  owner?: unknown;
  media?: Array<{ id: number | string; url?: string; media?: { url?: string; mimeType?: string }; type?: string }>;
}

export interface CreateListingInput {
  petName: string;
  animalTypeId: number;
  breedId: number;
  story?: string;
  approximateAge?: string;
  gender?: string;
  mediaIds?: number[];
}

export const adoptionApi = {
  getFeed: async (params?: Record<string, string | number | boolean | undefined>) => {
    return fetchApi<{ items: AdoptionListingSummary[]; nextCursor?: string }>("/adoption/feed", {
      params,
    });
  },

  // Left loosely typed (unlike getFeed) because `/adoption/[id]/page.tsx`
  // already reads several fields that don't exist on `AdoptionListingSummary`
  // (or, per the feature-matrix doc, in the actual backend response at
  // all) — typing this strictly would fail that page's build. Callers that
  // want the real shape should assert `as AdoptionListingSummary` locally.
  getListing: async (id: string | number) => {
    return fetchApi<any>(`/adoption/${id}`);
  },

  applyForAdoption: async (id: string | number, payload: any) => {
    return fetchApi<any>(`/adoption/${id}/apply`, {
      method: "POST",
      body: payload,
    });
  },
  
  getMyListings: async () => {
    return fetchApi<any[]>("/adoption/my");
  },

  getMyApplications: async () => {
    return fetchApi<any[]>("/me/adoption-applications");
  },

  createDraft: async (input: CreateListingInput) => {
    return fetchApi<any>("/adoption/drafts", { method: "POST", body: input });
  },

  publishListing: async (id: string | number) => {
    return fetchApi<any>(`/adoption/${id}/publish`, { method: "POST" });
  },

  updateStatus: async (id: string | number, status: string) => {
    return fetchApi<any>(`/adoption/${id}/status`, { method: "POST", body: { status } });
  },

  getListingApplications: async (id: string | number) => {
    return fetchApi<any[]>(`/me/adoptions/${id}/applications`);
  },

  updateApplicationStatus: async (applicationId: string | number, status: string) => {
    return fetchApi<any>(`/me/adoption-applications/${applicationId}/status`, {
      method: "POST",
      body: { status },
    });
  },

  favoriteListing: async (id: string | number) => {
    return fetchApi<any>(`/adoption/${id}/favorite`, { method: "POST" });
  },

  unfavoriteListing: async (id: string | number) => {
    return fetchApi<any>(`/adoption/${id}/favorite`, { method: "DELETE" });
  }
};
