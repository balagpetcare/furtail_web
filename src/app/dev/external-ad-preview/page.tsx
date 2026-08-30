import { notFound } from "next/navigation";

import { ExternalAdCard } from "@/components/ads/external-ad-card";
import type { ExternalAdRenderContract } from "@/lib/api/petsmart-ads-client";

/**
 * Command 5 §4/§10 — a dev/test-only page proving ExternalAdCard's real
 * render + fail-open behavior in an actual browser (Playwright), without
 * requiring auth or seeded feed content. Never reachable in production.
 * Fixtures here mirror exactly what TestProviderAdapter's real HTTP
 * response shapes are (see docs/EXTERNAL_MEDIATION_ARCHITECTURE.md) — no
 * fabricated real-provider content.
 */
const fillFixture: ExternalAdRenderContract = {
  status: "FILL",
  deliveryType: "EXTERNAL",
  provider: "TEST_PROVIDER",
  placement: "HOME_FEED",
  format: "MARKUP",
  externalRequestId: "extreq_preview_fill",
  renderToken: "rendertok_preview",
  markup:
    '<div data-external-ad="test-provider" style="padding:12px;border:1px solid #ccc;">Sponsored (TEST_PROVIDER) — local test fixture, not a real ad</div>',
  clickThroughUrl: "https://example.test/external-ad-test-provider-click",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

const renderFailureFixture: ExternalAdRenderContract = {
  ...fillFixture,
  externalRequestId: "extreq_preview_render_failure",
  markup: '<div data-external-ad-broken="true">',
};

const expiredFixture: ExternalAdRenderContract = {
  ...fillFixture,
  externalRequestId: "extreq_preview_expired",
  expiresAt: new Date(Date.now() - 60_000).toISOString(),
};

export default function ExternalAdPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>External Ad Render Preview (dev/test only)</h1>

      <section data-testid="preview-fill">
        <h2>FILL</h2>
        <ExternalAdCard ad={fillFixture} />
      </section>

      <section data-testid="preview-render-failure">
        <h2>RENDER_FAILURE (must render nothing)</h2>
        <ExternalAdCard ad={renderFailureFixture} />
      </section>

      <section data-testid="preview-expired">
        <h2>Expired (must render nothing)</h2>
        <ExternalAdCard ad={expiredFixture} />
      </section>
    </div>
  );
}
