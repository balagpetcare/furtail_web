export const CENTRAL_AUTH_POPUP_MESSAGE_TYPE = 'FURTAIL_AUTH_COMPLETE' as const;

export interface CentralAuthPopupMessage {
  type: typeof CENTRAL_AUTH_POPUP_MESSAGE_TYPE;
  success: boolean;
  issuedAt: number;
}

export function buildCentralAuthPopupFeatures(): string {
  return [
    'popup=yes',
    'width=560',
    'height=720',
    'menubar=no',
    'toolbar=no',
    'location=yes',
    'status=no',
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');
}

export function openCentralAuthPopup(startUrl: string): Window | null {
  if (typeof window === 'undefined') return null;
  const popup = window.open(startUrl, 'furtail-central-auth', buildCentralAuthPopupFeatures());
  popup?.focus?.();
  return popup;
}

export function isCentralAuthPopupMessage(data: unknown): data is CentralAuthPopupMessage {
  if (!data || typeof data !== 'object') return false;
  const message = data as Record<string, unknown>;
  return (
    message.type === CENTRAL_AUTH_POPUP_MESSAGE_TYPE
    && typeof message.success === 'boolean'
    && typeof message.issuedAt === 'number'
  );
}

/**
 * Strict origin + source-window validation for the opener's message listener
 * — the popup only ever runs same-origin (it's furtail_web's own
 * /popup-complete page), so an exact origin match plus source-window
 * identity is sufficient replay/spoof protection without needing a flowId.
 */
export function isTrustedCentralAuthPopupEvent(
  event: Pick<MessageEvent<unknown>, 'data' | 'origin' | 'source'>,
  expectedOrigin: string,
  popupWindow: Window | null,
): event is MessageEvent<CentralAuthPopupMessage> {
  if (event.origin !== expectedOrigin) return false;
  if (popupWindow && event.source && event.source !== popupWindow) return false;
  return isCentralAuthPopupMessage(event.data);
}

export function publishCentralAuthPopupResult(success: boolean, targetOrigin: string): void {
  if (typeof window === 'undefined') return;
  const message: CentralAuthPopupMessage = {
    type: CENTRAL_AUTH_POPUP_MESSAGE_TYPE,
    success,
    issuedAt: Date.now(),
  };
  try {
    window.opener?.postMessage(message, targetOrigin);
  } catch {
    // Best-effort only; the fallback UI ("you can close this window") remains visible.
  }
}
