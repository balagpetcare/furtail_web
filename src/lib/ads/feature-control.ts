/**
 * Ads feature control — manages which ad formats are enabled.
 *
 * Hierarchy:
 * 1. ADS_GLOBAL_ENABLED (kill switch)
 * 2. Format-specific flags (VIDEO_ADS_ENABLED, REELS_ADS_ENABLED)
 * 3. Placement-specific flags (VIDEO_PRE_ROLL, VIDEO_MID_ROLL, etc.)
 *
 * If any flag is missing/unavailable, defaults to DISABLED (fail-open).
 */

export interface AdsFeatureConfig {
  /**Global ads kill switch.*/
  globalEnabled: boolean;
  /**Video ads enabled (pre-roll, mid-roll, post-roll).*/
  videoAdsEnabled: boolean;
  /**Reels ads enabled (in-feed sponsored reels).*/
  reelsAdsEnabled: boolean;
  /**Pre-roll ads enabled.*/
  preRollEnabled: boolean;
  /**Mid-roll ads enabled.*/
  midRollEnabled: boolean;
  /**Post-roll ads enabled.*/
  postRollEnabled: boolean;
}

const DEFAULT_CONFIG: AdsFeatureConfig = {
  globalEnabled: false,
  videoAdsEnabled: false,
  reelsAdsEnabled: false,
  preRollEnabled: false,
  midRollEnabled: false,
  postRollEnabled: false,
};

/**
 * Determine if a feature is enabled given the configuration.
 *
 * Fail-open: If any config value is missing, feature is disabled.
 */
export function isFeatureEnabled(config: AdsFeatureConfig, feature: keyof AdsFeatureConfig): boolean {
  // Global kill switch overrides everything
  if (feature !== 'globalEnabled' && !config.globalEnabled) {
    return false;
  }

  const value = config[feature];
  return value === true;
}

/**
 * Determine if video ads (any placement) can be shown.
 */
export function canShowVideoAds(config: AdsFeatureConfig): boolean {
  return (
    isFeatureEnabled(config, 'globalEnabled') &&
    isFeatureEnabled(config, 'videoAdsEnabled')
  );
}

/**
 * Determine if reels ads can be shown.
 */
export function canShowReelsAds(config: AdsFeatureConfig): boolean {
  return (
    isFeatureEnabled(config, 'globalEnabled') &&
    isFeatureEnabled(config, 'reelsAdsEnabled')
  );
}

/**
 * Determine if a specific video placement can be shown.
 */
export function canShowPlacement(
  config: AdsFeatureConfig,
  placement: 'pre_roll' | 'mid_roll' | 'post_roll'
): boolean {
  if (!canShowVideoAds(config)) {
    return false;
  }

  switch (placement) {
    case 'pre_roll':
      return isFeatureEnabled(config, 'preRollEnabled');
    case 'mid_roll':
      return isFeatureEnabled(config, 'midRollEnabled');
    case 'post_roll':
      return isFeatureEnabled(config, 'postRollEnabled');
  }
}

/**
 * Fetch feature config from backend.
 * On any failure, returns default (disabled).
 */
export async function fetchAdsFeatureConfig(): Promise<AdsFeatureConfig> {
  try {
    const response = await fetch('/api/v1/ads/features', {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (!response.ok) {
      console.warn(`[AdsFeatureControl] Failed to fetch config: ${response.status}`);
      return DEFAULT_CONFIG;
    }

    const data = (await response.json()) as Partial<AdsFeatureConfig>;

    // Validate and merge with defaults (fail-open for any missing keys)
    return {
      globalEnabled: data.globalEnabled ?? false,
      videoAdsEnabled: data.videoAdsEnabled ?? false,
      reelsAdsEnabled: data.reelsAdsEnabled ?? false,
      preRollEnabled: data.preRollEnabled ?? false,
      midRollEnabled: data.midRollEnabled ?? false,
      postRollEnabled: data.postRollEnabled ?? false,
    };
  } catch (error) {
    console.warn('[AdsFeatureControl] Error fetching config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Polling cache for feature config.
 * Refetches every 5 minutes or on explicit refresh.
 */
class FeatureConfigCache {
  private config: AdsFeatureConfig | null = null;
  private lastFetch = 0;
  private refreshIntervalMs = 5 * 60 * 1000; // 5 minutes

  async getConfig(): Promise<AdsFeatureConfig> {
    const now = Date.now();
    if (this.config && now - this.lastFetch < this.refreshIntervalMs) {
      return this.config;
    }

    this.config = await fetchAdsFeatureConfig();
    this.lastFetch = now;
    return this.config;
  }

  refresh(): void {
    this.lastFetch = 0;
  }
}

const cache = new FeatureConfigCache();

export async function getAdsFeatureConfig(): Promise<AdsFeatureConfig> {
  return cache.getConfig();
}

export function refreshAdsFeatureConfig(): void {
  cache.refresh();
}
