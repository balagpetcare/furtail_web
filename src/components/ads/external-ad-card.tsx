"use client";

/**
 * Renders one external ad delivered via the Command 5 render contract
 * (petsmart-ads-client.ts ExternalAdRenderContract). Fail-open by
 * construction: if the markup is missing, malformed, or the format is
 * unsupported, this renders nothing and the caller's organic content
 * continues — an external render/tracking problem must never break Home
 * Feed, Video Feed, Reels, or normal video playback.
 *
 * Only renders TEST_PROVIDER MARKUP-format fixtures in this local pass —
 * real providers (GOOGLE/META/APPLOVIN/PUBMATIC) are NOT_IMPLEMENTED
 * server-side, so this path is never reached for them; see
 * docs/EXTERNAL_MEDIATION_ARCHITECTURE.md.
 */
import { useEffect, useRef } from "react";

import { trackExternalAdEvent } from "@/lib/api/petsmart-ads-client";
import type { ExternalAdRenderContract } from "@/lib/api/petsmart-ads-client";

// Only a markup fragment matching this exact known-safe TEST_PROVIDER
// fixture shape is ever rendered. Anything else (malformed, unexpected
// provider, unexpected format) fails open to null.
const SAFE_TEST_PROVIDER_MARKUP_PREFIX = '<div data-external-ad="test-provider"';

export function isRenderable(ad: ExternalAdRenderContract): boolean {
  if (ad.format !== "MARKUP") return false;
  if (ad.provider !== "TEST_PROVIDER") return false;
  if (!ad.markup || !ad.markup.startsWith(SAFE_TEST_PROVIDER_MARKUP_PREFIX)) return false;
  if (!ad.markup.trim().endsWith("</div>")) return false; // malformed/unterminated -> fail open
  if (new Date(ad.expiresAt).getTime() < Date.now()) return false;
  return true;
}

export function ExternalAdCard({ ad }: { ad: ExternalAdRenderContract }) {
  const impressionFired = useRef(false);

  useEffect(() => {
    if (impressionFired.current) return;
    if (!isRenderable(ad)) return;
    impressionFired.current = true;
    void trackExternalAdEvent({
      eventId: `${ad.externalRequestId}-impression`,
      externalRequestId: ad.externalRequestId,
      provider: ad.provider,
      placement: ad.placement,
      eventType: "IMPRESSION",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad.externalRequestId]);

  if (!isRenderable(ad)) {
    return null;
  }

  function handleClick() {
    void trackExternalAdEvent({
      eventId: `${ad.externalRequestId}-click`,
      externalRequestId: ad.externalRequestId,
      provider: ad.provider,
      placement: ad.placement,
      eventType: "CLICK",
    });
    if (ad.clickThroughUrl) {
      window.open(ad.clickThroughUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div
      data-testid="external-ad-card"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      // Markup is a known-safe, server-controlled test fixture validated by
      // isRenderable() above — never arbitrary/user-influenced HTML.
      dangerouslySetInnerHTML={{ __html: ad.markup ?? "" }}
    />
  );
}
