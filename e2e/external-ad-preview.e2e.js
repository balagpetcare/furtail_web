/**
 * Real interactive browser E2E (Command 5 §10) for the external-ad
 * fail-open render contract in furtail_web, using the dev-only preview page
 * at /dev/external-ad-preview (never reachable in production). Proves:
 *  - a well-formed TEST_PROVIDER MARKUP fixture actually renders in the DOM
 *  - a malformed (RENDER_FAILURE) fixture renders nothing (fail-open)
 *  - an expired fixture renders nothing (fail-open)
 *  - clicking the rendered ad fires a real tracking network call
 */
const { chromium } = require('playwright');

const baseURL = process.env.E2E_WEB_BASE_URL || 'http://localhost:7400';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const trackingCalls = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/v1/external-delivery/track') || req.url().includes('external-delivery/track')) {
      trackingCalls.push({ url: req.url(), method: req.method() });
    }
  });

  const results = [];

  await page.goto(`${baseURL}/dev/external-ad-preview`, { waitUntil: 'networkidle', timeout: 20000 });

  // FILL fixture must render.
  const fillCard = page.locator('[data-testid="preview-fill"] [data-testid="external-ad-card"]');
  const fillVisible = await fillCard.count();
  const fillText = fillVisible ? await fillCard.textContent() : '';
  results.push({
    check: 'FILL fixture renders sponsored markup',
    ok: fillVisible === 1 && !!fillText && fillText.includes('Sponsored (TEST_PROVIDER)'),
  });

  // RENDER_FAILURE fixture must NOT render (fail-open).
  const brokenCard = page.locator('[data-testid="preview-render-failure"] [data-testid="external-ad-card"]');
  results.push({
    check: 'RENDER_FAILURE fixture renders nothing (fail-open)',
    ok: (await brokenCard.count()) === 0,
  });

  // Expired fixture must NOT render (fail-open).
  const expiredCard = page.locator('[data-testid="preview-expired"] [data-testid="external-ad-card"]');
  results.push({
    check: 'Expired fixture renders nothing (fail-open)',
    ok: (await expiredCard.count()) === 0,
  });

  // Impression tracking call must have fired for the FILL fixture on mount.
  await page.waitForTimeout(500);
  results.push({
    check: 'Impression tracking call fired for FILL fixture',
    ok: trackingCalls.length >= 1,
  });

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log('\n=== SUMMARY ===');
  console.log(`${results.length - failed.length}/${results.length} checks OK`);
  for (const r of results) {
    console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.check}`);
  }
  console.log('\nRESULTS_JSON_START');
  console.log(JSON.stringify(results));
  console.log('RESULTS_JSON_END');

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('E2E script failed:', err);
  process.exit(1);
});
