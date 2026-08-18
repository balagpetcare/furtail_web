import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_FURTAIL_API_URL: z.string().url().default("http://localhost:7300/api/v1"),
  NEXT_PUBLIC_WPA_AUTH_WEB_URL: z.string().url().default("http://localhost:5011"),
  WPA_AUTH_API_URL: z.string().url().default("http://localhost:5010/api/v1"),
  WPA_CLIENT_ID: z.string().default("furtail-web"),
  WPA_CLIENT_SECRET: z.string().default("test_secret"),
  WPA_REDIRECT_URI: z.string().url().default("http://localhost:7400/api/auth/callback"),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_FURTAIL_API_URL: process.env.NEXT_PUBLIC_FURTAIL_API_URL,
  NEXT_PUBLIC_WPA_AUTH_WEB_URL: process.env.NEXT_PUBLIC_WPA_AUTH_WEB_URL,
  WPA_AUTH_API_URL: process.env.WPA_AUTH_API_URL,
  WPA_CLIENT_ID: process.env.WPA_CLIENT_ID,
  WPA_CLIENT_SECRET: process.env.WPA_CLIENT_SECRET,
  WPA_REDIRECT_URI: process.env.WPA_REDIRECT_URI,
});
