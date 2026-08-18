import { fetchApi } from "../api-client";

export const usersKeys = {
  all: ["users"] as const,
  detail: (id: string) => [...usersKeys.all, id] as const,
  followers: (id: string) => [...usersKeys.detail(id), "followers"] as const,
  following: (id: string) => [...usersKeys.detail(id), "following"] as const,
};

/** Matches `toSharedProfilePayload` in furtail_app_api's shared-user-profile.ts. */
export interface SharedProfilePayload {
  id: number;
  publicId: string;
  auth: { email: string; phone: string | null };
  profile: {
    displayName: string;
    username: string | null;
    bio: string | null;
    avatarMedia: { id: number; url: string } | null;
    coverMedia: { id: number; url: string } | null;
    placeLive: string | null;
    visibility: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const usersApi = {
  getProfile: async (userId: string) => {
    return fetchApi<SharedProfilePayload>(`/user/${userId}`);
  },

  getProfileByUsername: async (username: string) => {
    return fetchApi<SharedProfilePayload>(`/user/by-username/${username}`);
  },

  getMe: async () => {
    return fetchApi<SharedProfilePayload>("/user/me");
  },

  updateProfile: async (data: Record<string, unknown>) => {
    return fetchApi<SharedProfilePayload>("/user/me", {
      method: "PATCH",
      body: data,
    });
  },
};
