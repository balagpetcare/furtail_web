/**
 * Client for PetSmart Ads API integration.
 * Handles ad delivery requests and event tracking for video ads.
 */

import { env } from '@/config/env';

interface AdCreative {
  id: string;
  name: string;
  type: string;
  assetUrl: string | null;
  videoUrl: string | null;
  headline: string | null;
  body: string | null;
}

interface AdObject {
  id: string;
  name: string;
  destinationUrl: string;
  ctaText: string | null;
  creative: AdCreative | null;
}

/**
 * Command 5 §3 — the external ad render contract, mirroring
 * petsmart_ads_api's ExternalAdRenderContract (docs/EXTERNAL_MEDIATION_ARCHITECTURE.md).
 * Only fields needed to render/track. Never contains provider secrets.
 */
export interface ExternalAdRenderContract {
  status: 'FILL';
  deliveryType: 'EXTERNAL';
  provider: string;
  placement: string;
  format: string;
  externalRequestId: string;
  renderToken?: string;
  markup?: string;
  clickThroughUrl?: string;
  expiresAt: string;
}

export type AdResponse =
  | { status: 'FILL'; deliveryRequestId?: string; ad: AdObject }
  | ExternalAdRenderContract
  | { status: 'NO_FILL' }
  | { status: 'UNAVAILABLE' };

interface TrackingEventInput {
  eventId: string;
  deliveryRequestId: string;
  adId: string;
  eventType: 'impression' | 'viewable_impression' | 'click' | 'video_start' | 'video_25' | 'video_50' | 'video_75' | 'video_complete' | 'hide' | 'report';
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

const TIMEOUT_MS = 5000;
const COOLDOWN_MS = 5000;
const failureCooldownUntil = new Map<string, number>();

function isCoolingDown(service: string): boolean {
  return (failureCooldownUntil.get(service) ?? 0) > Date.now();
}

function markFailure(service: string): void {
  failureCooldownUntil.set(service, Date.now() + COOLDOWN_MS);
}

/**
 * Request an ad for a specific placement from the PetSmart Ads API.
 * Uses the existing Phase 11 delivery pipeline: eligibility → targeting →
 * ranking → auction → atomic reservation/fallback → delivery.
 */
export async function requestAdForPlacement(input: {
  userId: string;
  placementCode: string;
  context: Record<string, unknown>;
  sessionId?: string;
  requestId?: string;
}): Promise<AdResponse> {
  if (!env.NEXT_PUBLIC_PETSMART_ADS_API_URL) {
    return { status: 'UNAVAILABLE' };
  }

  if (isCoolingDown('ads')) {
    return { status: 'UNAVAILABLE' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(
      `${env.NEXT_PUBLIC_PETSMART_ADS_API_URL}/api/v1/ad-delivery/request`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-internal-api-key': env.NEXT_PUBLIC_PETSMART_INTERNAL_API_KEY ?? '',
        },
        body: JSON.stringify({
          requestId: input.requestId ?? crypto.randomUUID?.() ?? `req-${Date.now()}`,
          userId: input.userId,
          placement: { code: input.placementCode },
          context: input.context,
          sessionId: input.sessionId,
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      markFailure('ads');
      return { status: 'UNAVAILABLE' };
    }

    const body = (await response.json()) as { data?: AdResponse };
    return body.data ?? { status: 'NO_FILL' };
  } catch (error) {
    console.error('[PetSmartAdsClient] Ad request failed:', error);
    markFailure('ads');
    return { status: 'UNAVAILABLE' };
  }
}

/**
 * Track an ad event (impression, completion, click, etc.) in the PetSmart Ads API.
 * Best-effort — failures are logged but do not throw.
 */
export async function trackPetSmartAdEvent(input: TrackingEventInput): Promise<void> {
  if (!env.NEXT_PUBLIC_PETSMART_ADS_API_URL) {
    return;
  }

  if (isCoolingDown('ads')) {
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    await fetch(
      `${env.NEXT_PUBLIC_PETSMART_ADS_API_URL}/api/v1/ad-tracking/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-internal-api-key': env.NEXT_PUBLIC_PETSMART_INTERNAL_API_KEY ?? '',
        },
        body: JSON.stringify({
          ...input,
          occurredAt: new Date().toISOString(),
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);
  } catch (error) {
    console.error('[PetSmartAdsClient] Tracking event failed:', error);
    markFailure('ads');
  }
}

interface ExternalTrackingEventInput {
  eventId: string;
  externalRequestId: string;
  provider: string;
  placement: string;
  eventType: 'IMPRESSION' | 'CLICK' | 'VIDEO_START' | 'VIDEO_COMPLETE';
}

/**
 * Track an external-ad event (Command 5 §6). Deliberately separate from
 * trackPetSmartAdEvent — external ads have no first-party ad row. Best-effort,
 * fail-open: a tracking failure must never block content or throw.
 */
export async function trackExternalAdEvent(input: ExternalTrackingEventInput): Promise<void> {
  if (!env.NEXT_PUBLIC_PETSMART_ADS_API_URL) {
    return;
  }
  if (isCoolingDown('ads')) {
    return;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    await fetch(`${env.NEXT_PUBLIC_PETSMART_ADS_API_URL}/api/v1/external-delivery/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-internal-api-key': env.NEXT_PUBLIC_PETSMART_INTERNAL_API_KEY ?? '',
      },
      body: JSON.stringify({
        ...input,
        occurredAt: new Date().toISOString(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (error) {
    console.error('[PetSmartAdsClient] External tracking event failed:', error);
    markFailure('ads');
  }
}
