import test from 'node:test';
import assert from 'node:assert/strict';

test('openCentralAuthPopup opens a named popup window and focuses it', async () => {
  const { openCentralAuthPopup } = await import('./popup');
  const focus = () => {};
  const fakeWindow = { focus, closed: false } as unknown as Window;
  let capturedFeatures = '';
  (globalThis as unknown as { window: unknown }).window = {
    open: (_url: string, _name: string, features: string) => {
      capturedFeatures = features;
      return fakeWindow;
    },
  };
  const popup = openCentralAuthPopup('https://example.com/start');
  assert.equal(popup, fakeWindow);
  assert.match(capturedFeatures, /width=560/);
});

test('openCentralAuthPopup returns null when the browser blocks the popup', async () => {
  const { openCentralAuthPopup } = await import('./popup');
  (globalThis as unknown as { window: unknown }).window = { open: () => null };
  const popup = openCentralAuthPopup('https://example.com/start');
  assert.equal(popup, null);
});

test('isTrustedCentralAuthPopupEvent rejects a mismatched origin', async () => {
  const { isTrustedCentralAuthPopupEvent } = await import('./popup');
  const event = { data: { type: 'FURTAIL_AUTH_COMPLETE', success: true, issuedAt: Date.now() }, origin: 'https://evil.example', source: null };
  assert.equal(isTrustedCentralAuthPopupEvent(event, 'https://furtail.app', null), false);
});

test('isTrustedCentralAuthPopupEvent rejects a message from a different window than the tracked popup', async () => {
  const { isTrustedCentralAuthPopupEvent } = await import('./popup');
  const popupWindow = {} as Window;
  const otherWindow = {} as Window;
  const event = { data: { type: 'FURTAIL_AUTH_COMPLETE', success: true, issuedAt: Date.now() }, origin: 'https://furtail.app', source: otherWindow };
  assert.equal(isTrustedCentralAuthPopupEvent(event, 'https://furtail.app', popupWindow), false);
});

test('isTrustedCentralAuthPopupEvent rejects a malformed message shape', async () => {
  const { isTrustedCentralAuthPopupEvent } = await import('./popup');
  const event = { data: { hello: 'world' }, origin: 'https://furtail.app', source: null };
  assert.equal(isTrustedCentralAuthPopupEvent(event, 'https://furtail.app', null), false);
});

test('isTrustedCentralAuthPopupEvent accepts a same-origin, same-source, well-formed message', async () => {
  const { isTrustedCentralAuthPopupEvent } = await import('./popup');
  const popupWindow = {} as Window;
  const event = { data: { type: 'FURTAIL_AUTH_COMPLETE', success: true, issuedAt: Date.now() }, origin: 'https://furtail.app', source: popupWindow };
  assert.equal(isTrustedCentralAuthPopupEvent(event, 'https://furtail.app', popupWindow), true);
});

test('publishCentralAuthPopupResult posts only a type/success/issuedAt signal to window.opener — never OAuth material', async () => {
  const { publishCentralAuthPopupResult } = await import('./popup');
  let posted: unknown;
  let postedOrigin: string | undefined;
  (globalThis as unknown as { window: unknown }).window = {
    opener: {
      postMessage: (message: unknown, origin: string) => {
        posted = message;
        postedOrigin = origin;
      },
    },
  };
  publishCentralAuthPopupResult(true, 'https://furtail.app');
  assert.deepEqual(Object.keys(posted as object).sort(), ['issuedAt', 'success', 'type']);
  assert.equal((posted as { success: boolean }).success, true);
  assert.equal(postedOrigin, 'https://furtail.app');
});
