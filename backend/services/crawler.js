import { chromium } from 'playwright';

import { searchForSites }                                        from './crawler/urlBuilder.js';
import { checkForPasskeyOnPage }                                 from './crawler/staticDetector.js';
import { injectWebAuthnInterceptor, checkRuntimeWebAuthnCall }   from './crawler/runtimeDetector.js';
import { navigateToLogin }                                       from './crawler/loginNavigator.js';
import { advanceAuthFlow }                                       from './crawler/authFlowTracker.js';
import { withPopupWatch }                                        from './crawler/popupHandler.js';
import { classifyPasskeyType }                                   from './crawler/brandMapper.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Runs static + runtime detection at the current page state.
 * Returns a unified detection object or null.
 */
async function detectNow(page) {
  const s = await checkForPasskeyOnPage(page);
  if (s.found) return { method: s.method, signalSourceUrl: s.signalSourceUrl };

  const r = await checkRuntimeWebAuthnCall(page);
  if (r.called) {
    return {
      method: `Runtime: navigator.credentials.${r.method}()`,
      signalSourceUrl: r.signalSourceUrl,
    };
  }

  return null;
}

/**
 * Builds the full result object returned by detectPasskey().
 * Infers a coarse detection source from the method string.
 */
function inferDetectionSource(method) {
  const m = (method || '').toLowerCase();

  if (m.includes('popup')) return 'popup';
  if (m.startsWith('runtime:') || m.includes('navigator.credentials')) return 'runtime';
  if (m.startsWith('network:')) return 'network';
  return 'static';
}

function buildResult(hasPasskey, passkeyType, method, title, finalUrl, description, extra = {}) {
  return {
    hasPasskey,
    passkeyType,
    detectionMethod:     method,
    detectionSource:     inferDetectionSource(method),
    title,
    description,
    finalUrl,
    signalSourceUrl:     extra.signalSourceUrl || finalUrl,
    crawlStatus:         extra.crawlStatus || 'success',
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Entry point: given a user query, crawls up to 5 candidate URLs and
 * returns a list of result objects ready to be saved to the database.
 *
 * @param {string} query
 * @returns {Promise<Array>}
 */
export const crawlWeb = async (query) => {
  console.log(`[Crawler] Starting passkey detection for: ${query}`);
  try {
    const sites = await searchForSites(query);
    const results = [];

    for (const site of sites.slice(0, 5)) {
      console.log(`[Crawler] Checking ${site.url}…`);
      const result = await detectPasskey(site.url);

      if (result.hasPasskey) {
        const typeLabel = result.passkeyType === 'native' ? 'Native Passkey' : 'Third-Party Passkey';
        results.push({
          title:               site.title || result.title || 'Passkey-Enabled Site',
          url:                 site.url,
          description:         result.description || `Supports Passkey/WebAuthn. ${result.detectionMethod}`,
          category:            typeLabel,
          tags:                [],
          hasPasskey:          true,
          passkeyType:         result.passkeyType,
          detectionSource:     result.detectionSource,
          signalSourceUrl:     result.signalSourceUrl || '',
          finalUrl:            result.finalUrl || site.url,
          crawlStatus:         result.crawlStatus || 'success',
        });
        console.log(`[Crawler] ✓ ${site.url} (${result.passkeyType}, source=${result.detectionSource})`);
      } else {
        results.push({
          title:       site.title || 'Site',
          url:         site.url,
          description: 'No Passkey/WebAuthn support detected.',
          category:    'No-Passkey',
          tags:        [],
          hasPasskey:  false,
          passkeyType: 'none',
          crawlStatus: result.crawlStatus || 'success',
        });
        console.log(`[Crawler] ✗ ${site.url} (status: ${result.crawlStatus || 'success'})`);
      }
    }

    return results;
  } catch (error) {
    console.error('[Crawler] Error:', error.message);
    return [];
  }
};

/**
 * Detects passkey support for a single URL.
 * Detection runs in stages — stops as soon as a positive signal is found.
 *
 * Stage 1 — main page: static + runtime detectors
 * Stage 2 — main page: popup/new-tab watch
 * Stage 3 — navigate to login page
 * Stage 4 — login page: static + runtime detectors
 * Stage 5 — multi-step auth flow (email entry + next-step button clicks)
 * Stage 6 — network request fallback (FIDO2/WebAuthn endpoint observed)
 *
 * @param {string} url
 * @returns {Promise<Object>}
 */
export async function detectPasskey(url) {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport:          { width: 1920, height: 1080 },
      userAgent:         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    });

    await injectWebAuthnInterceptor(context);

    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    // Track FIDO2/WebAuthn network requests as a last-resort signal
    const fido2Requests = [];
    page.on('request', req => {
      const u = req.url().toLowerCase();
      if (['webauthn', 'fido', 'attestation', 'assertion', 'passkey'].some(kw => u.includes(kw))) {
        fido2Requests.push(req.url());
      }
    });

    // Load the target page
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      await browser.close();
      const status = e.message.includes('ERR_NAME_NOT_RESOLVED') ||
                     e.message.includes('ERR_CONNECTION_REFUSED') ? 'unreachable' : 'error';
      return { hasPasskey: false, passkeyType: 'none', crawlStatus: status, error: e.message };
    }
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch (_) {}
    await page.waitForTimeout(3000);

    // ── Stage 1: main page ──────────────────────────────────────────────────
    let hit = await detectNow(page);
    if (hit) {
      const passkeyType = classifyPasskeyType(url, hit.signalSourceUrl || page.url());
      const s = { title: await page.title(), url: page.url() };
      await browser.close();
      return buildResult(true, passkeyType, hit.method, s.title, s.url, 'Found on main page', { signalSourceUrl: hit.signalSourceUrl });
    }

    // ── Stage 2: popup watch on main page ───────────────────────────────────
    const popupMain = await withPopupWatch(context, () => page.waitForTimeout(1500));
    if (popupMain.found) {
      const passkeyType = classifyPasskeyType(url, popupMain.signalSourceUrl);
      await browser.close();
      return buildResult(true, passkeyType, popupMain.method, await page.title(), page.url(), 'Found in popup from main page', { signalSourceUrl: popupMain.signalSourceUrl });
    }

    // ── Stage 3: navigate to login ──────────────────────────────────────────
    let reachedLogin = false;
    try { reachedLogin = await navigateToLogin(page); }
    catch (e) { console.log('[Crawler] Login navigation error:', e.message); }

    if (reachedLogin) {
      try { await page.waitForLoadState('domcontentloaded', { timeout: 8000 }); } catch (_) {}
      await page.waitForTimeout(3000);

      // ── Stage 4: login page ───────────────────────────────────────────────
      hit = await detectNow(page);
      if (hit) {
        const passkeyType = classifyPasskeyType(url, hit.signalSourceUrl || page.url());
        const s = { title: await page.title(), url: page.url() };
        await browser.close();
        return buildResult(true, passkeyType, hit.method, s.title, s.url, 'Found on login page', { signalSourceUrl: hit.signalSourceUrl });
      }

      // ── Stage 5: multi-step auth flow ─────────────────────────────────────
      try {
        const flowHit = await advanceAuthFlow(page);
        if (flowHit) {
          const passkeyType = classifyPasskeyType(url, flowHit.signalSourceUrl || page.url());
          const s = { title: await page.title(), url: page.url() };
          await browser.close();
          return buildResult(true, passkeyType, flowHit.method, s.title, s.url, 'Found during multi-step auth flow', { signalSourceUrl: flowHit.signalSourceUrl });
        }
      } catch (e) {
        console.log('[Crawler] Auth flow error:', e.message);
      }
    }

    // ── Stage 6: network fallback ───────────────────────────────────────────
    if (fido2Requests.length > 0) {
      const signalUrl   = fido2Requests[0];
      const passkeyType = classifyPasskeyType(url, signalUrl);
      const s = { title: await page.title(), url: page.url() };
      await browser.close();
      return buildResult(true, passkeyType, 'Network: FIDO2/WebAuthn request detected', s.title, s.url, 'WebAuthn network request observed', { signalSourceUrl: signalUrl });
    }

    await browser.close();
    return { hasPasskey: false, passkeyType: 'none', crawlStatus: 'success' };

  } catch (error) {
    if (browser) await browser.close();
    console.error(`[Crawler] Error at ${url}:`, error.message);
    return { hasPasskey: false, passkeyType: 'none', crawlStatus: 'error', error: error.message };
  }
}
