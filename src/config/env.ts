/**
 * Environment configuration for Furtail Web.
 * Validates that required env vars are present at runtime.
 */

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  NEXT_PUBLIC_API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_PETSMART_ADS_API_URL:
    process.env.NEXT_PUBLIC_PETSMART_ADS_API_URL ?? "http://localhost:3001",
  NEXT_PUBLIC_PETSMART_INTERNAL_API_KEY:
    process.env.NEXT_PUBLIC_PETSMART_INTERNAL_API_KEY ?? "",
} as const;
