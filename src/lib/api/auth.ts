import { fetchApi } from "../api-client";
import type { SharedProfilePayload } from "./users";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export const authApi = {
  /** Matches `toSharedProfilePayload` — see `users.ts`'s `SharedProfilePayload`. */
  getMe: async () => {
    return fetchApi<SharedProfilePayload>("/user/me");
  },
};
