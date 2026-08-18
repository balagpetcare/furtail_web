import { fetchApi } from "../api-client";

export const fundraisingKeys = {
  all: ["fundraising"] as const,
  feed: () => [...fundraisingKeys.all, "feed"] as const,
  campaign: (id: string | number) => [...fundraisingKeys.all, "campaign", id] as const,
  my: () => [...fundraisingKeys.all, "my"] as const,
  updates: (id: string | number) => [...fundraisingKeys.campaign(id), "updates"] as const,
  paymentStatus: (referenceId: string) => [...fundraisingKeys.all, "payment", referenceId] as const,
};

/** Matches the canonical category catalog in Flutter's fundraising_option_catalog.dart. */
export const FUNDRAISING_CATEGORIES = [
  { value: "TREATMENT", label: "Treatment" },
  { value: "RESCUE", label: "Rescue" },
  { value: "SHELTER", label: "Shelter" },
  { value: "FOOD", label: "Food" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "OTHER", label: "Other" },
] as const;

export const FUNDRAISING_BENEFICIARY_TYPES = [
  { value: "PET", label: "Pet" },
  { value: "PERSON", label: "Person" },
  { value: "SHELTER", label: "Shelter" },
  { value: "ORGANIZATION", label: "Organization" },
  { value: "COMMUNITY", label: "Community" },
  { value: "OTHER", label: "Other" },
] as const;

/** Matches `campaignPayload` in fundraising-store.ts — fields this app actually reads, not the full backend payload. */
export interface FundraisingCampaignSummary {
  id: number | string;
  title: string;
  caption?: string | null;
  category?: string | null;
  status?: string;
  currencyCode?: string;
  targetAmountMinor?: number | string | null;
  stats?: { raisedAmount?: number | string; donorsCount?: number | string };
  media?: Array<{ id: number | string; url?: string; mimetype?: string; type?: string }>;
  author?: unknown;
}

export interface CreateCampaignInput {
  title: string;
  caption: string;
  category: string;
  beneficiaryType: string;
  beneficiaryName: string;
  fundingMode: "ONE_TIME";
  targetAmountMinor: number;
  currencyCode?: string;
  deadline: string; // ISO date
  mediaIds?: number[];
}

export const fundraisingApi = {
  getFeed: async (cursor?: string, limit: number = 20) => {
    return fetchApi<{ items: FundraisingCampaignSummary[]; nextCursor?: string }>("/fundraising/feed", {
      params: { cursor, limit },
    });
  },

  getMyCampaigns: async () => {
    return fetchApi<{ items: any[] }>("/fundraising/my/campaigns");
  },

  // Left loosely typed (unlike getFeed) because `/fundraising/[id]/page.tsx`
  // already reads several fields that don't exist on
  // `FundraisingCampaignSummary` (or in the actual backend response at
  // all — see the feature-matrix doc) — typing this strictly would fail
  // that page's build. Callers that want the real shape should assert
  // `as FundraisingCampaignSummary` locally.
  getCampaign: async (id: string | number) => {
    return fetchApi<any>(`/fundraising/campaigns/${id}`);
  },

  createCampaign: async (input: CreateCampaignInput) => {
    return fetchApi<any>("/fundraising/campaigns", { method: "POST", body: input });
  },

  updateCampaign: async (id: string | number, input: Partial<CreateCampaignInput>) => {
    return fetchApi<any>(`/fundraising/campaigns/${id}`, { method: "PATCH", body: input });
  },

  getUpdates: async (id: string | number) => {
    return fetchApi<{ items: any[] }>(`/fundraising/campaigns/${id}/updates`);
  },

  createDonationCheckout: async (
    id: string | number,
    payload: {
      amount: number;
      currencyCode?: string;
      returnUrl: string;
      cancelUrl: string;
      isAnonymous?: boolean;
      consentAccepted: boolean;
      supportMessage?: string;
      donorName?: string;
      donorEmail?: string;
    },
  ) => {
    return fetchApi<{
      donationIntent: { id: number; referenceId?: string };
      payment: { redirectUrl: string | null; referenceId?: string } | null;
      reused: boolean;
    }>(`/fundraising/campaigns/${id}/donate`, { method: "POST", body: payload });
  },

  getPaymentStatus: async (referenceId: string) => {
    return fetchApi<{ status: string }>(`/fundraising/payments/${referenceId}/status`);
  },
};
