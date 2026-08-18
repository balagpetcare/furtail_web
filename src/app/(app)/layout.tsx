import { AppShell } from "@/components/layout/app-shell";
import { RealtimeProvider } from "@/components/providers/realtime-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider>
      <AppShell>{children}</AppShell>
    </RealtimeProvider>
  );
}
