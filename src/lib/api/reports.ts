import { fetchApi } from "../api-client";

export type ReportType = "USER" | "POST" | "COMMENT" | "PET" | "FUNDRAISING";

export const reportsApi = {
  getReasons: async (type: ReportType) => {
    return fetchApi<{ items: Array<{ code: string; label: string }> }>("/reports/reasons", {
      params: { type },
    });
  },

  createReport: async (input: {
    type: ReportType;
    targetId: number;
    reasonCode: string;
    details?: string;
  }) => {
    return fetchApi<{ id: number; status: string }>("/reports", {
      method: "POST",
      body: input,
    });
  },
};
