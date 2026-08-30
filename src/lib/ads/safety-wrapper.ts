/**
 * Ads safety wrapper — ensures content remains playable even if ads fail.
 *
 * All ad operations are wrapped to guarantee:
 * - Ad failure never blocks content playback
 * - Content plays with or without ads
 * - Errors are logged but not thrown
 * - Timeouts don't hang the player
 */

export interface SafetyWrapperConfig {
  /**Timeout for ad operations in milliseconds.*/
  timeoutMs?: number;
  /**Whether to log errors to console.*/
  debug?: boolean;
}

const DEFAULT_CONFIG: Required<SafetyWrapperConfig> = {
  timeoutMs: 5000, // 5 seconds
  debug: false,
};

/**
 * Wrap an async operation to guarantee timeout and error safety.
 * Returns T on success, null on any failure.
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  name: string,
  config: SafetyWrapperConfig = DEFAULT_CONFIG
): Promise<T | null> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const timeoutPromise = new Promise<never>((_resolve, reject) =>
      setTimeout(
        () => reject(new Error(`${name} timeout after ${mergedConfig.timeoutMs}ms`)),
        mergedConfig.timeoutMs
      )
    );

    const result = await Promise.race([operation(), timeoutPromise]);
    return result;
  } catch (error) {
    if (mergedConfig.debug) {
      console.warn(`[SafetyWrapper] ${name} failed:`, error);
    }
    return null;
  }
}

/**
 * Wrap a synchronous operation for error safety.
 * Returns T on success, null on any failure.
 */
export function safeSync<T>(
  operation: () => T,
  name: string,
  config: SafetyWrapperConfig = DEFAULT_CONFIG
): T | null {
  try {
    return operation();
  } catch (error) {
    if (config.debug) {
      console.warn(`[SafetyWrapper] ${name} failed:`, error);
    }
    return null;
  }
}

/**
 * Safely handle ad API failures.
 *
 * Scenarios:
 * - API unavailable → return null (content plays)
 * - Timeout → return null (content plays)
 * - No candidates → return null (content plays)
 * - Budget exhaustion → return null (content plays)
 * - Reservation conflict → return null (content plays)
 */
export async function safeRequestAd<T>(
  request: () => Promise<T | null>,
  config: SafetyWrapperConfig = DEFAULT_CONFIG
): Promise<T | null> {
  return safeAsync(
    async () => {
      const result = await request();
      return result ?? null;
    },
    'Ad Request',
    config
  );
}

/**
 * Safely track ad events.
 * Failures must never affect playback.
 */
export async function safeTrackEvent(
  event: () => Promise<void>,
  config: SafetyWrapperConfig = DEFAULT_CONFIG
): Promise<void> {
  // Fire-and-forget: don't wait for tracking
  safeAsync(event, 'Ad Tracking', config).catch(() => {
    // Tracking failure is acceptable
  });
}

/**
 * Safely load ad media.
 * If media fails to load, content continues without ad.
 */
export async function safeLoadMedia(
  url: string,
  config: SafetyWrapperConfig = DEFAULT_CONFIG
): Promise<boolean> {
  return (
    (await safeAsync(
      async () => {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
      },
      `Load Ad Media: ${url}`,
      config
    )) ?? false
  );
}

/**
 * Scenario: Ads API unavailable
 * Safety: Content plays without ads
 */
export async function handleAdsApiUnavailable<T>(
  fallback: () => T,
  config: SafetyWrapperConfig = DEFAULT_CONFIG
): Promise<T> {
  if (config.debug) {
    console.warn('[SafetyWrapper] Ads API unavailable, using fallback');
  }
  return fallback();
}

/**
 * Scenario: Timeout fetching ad
 * Safety: Content plays immediately without ad
 */
export async function handleAdRequestTimeout<T>(
  fallback: () => T,
  config: SafetyWrapperConfig = DEFAULT_CONFIG
): Promise<T> {
  if (config.debug) {
    console.warn('[SafetyWrapper] Ad request timeout, using fallback');
  }
  return fallback();
}

/**
 * Scenario: No ad candidates (no-fill)
 * Safety: Content plays without ad
 */
export async function handleNoAdCandidates<T>(
  fallback: () => T,
  config: SafetyWrapperConfig = DEFAULT_CONFIG
): Promise<T> {
  if (config.debug) {
    console.warn('[SafetyWrapper] No ad candidates, using fallback');
  }
  return fallback();
}

/**
 * Scenario: Ad media fails to load
 * Safety: Content plays without ad
 */
export async function handleAdMediaFailure<T>(
  fallback: () => T,
  config: SafetyWrapperConfig = DEFAULT_CONFIG
): Promise<T> {
  if (config.debug) {
    console.warn('[SafetyWrapper] Ad media failed to load, using fallback');
  }
  return fallback();
}

/**
 * Scenario: Tracking fails (Redis down, network error, etc.)
 * Safety: Content plays normally, tracking loss is acceptable
 */
export function handleTrackingFailure(
  config: SafetyWrapperConfig = DEFAULT_CONFIG
): void {
  if (config.debug) {
    console.warn('[SafetyWrapper] Ad tracking failed (acceptable)');
  }
  // Tracking failure must not affect playback
}
