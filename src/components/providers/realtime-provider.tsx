"use client";

import React from "react";
import { useRealtime } from "@/hooks/use-realtime";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtime();
  return <>{children}</>;
}
