import { chromium } from 'playwright';

import { searchForSites }           from './crawler/urlBuilder.js';
import { checkForPasskeyOnPage }    from './crawler/staticDetector.js';
import { injectWebAuthnInterceptor, checkRuntimeWebAuthnCall } from './crawler/runtimeDetector.js';
import { navigateToLogin }          from './crawler/loginNavigator.js';
import { enterTestEmail }           from './crawler/emailInteractor.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compares the registrable domain (e.g. "apple.com") of the target URL
 * with that of the URL where the passkey signal was found.
 * Same domain → 'native', different domain → 'third-party'.
 */
function classifyPasskeyType(targetUrl, signalSourceUrl) {
  if (!signalSourceUrl) return 'native';
  try {
    const registrable = (url) => {
      const parts = new URL(url).hostname.split('.');
      return parts.slice(-2).join('.');
    };
    return registrable(targetUrl) === registrable(signalSourceUrl) ? 'native' : 'third-party';
  } catch (_) {
    return 'native';
  }
}

function buildResult(hasPasskey, passkeyType, method, title, foundUrl, description) {
  return { hasPasskey, passkeyType, detectionMethod: method, title, description, foundAtUrl: foundUrl };
}

async function snapshot(page) {
  return { title: await page.title(), url: page.url() };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Entry point: given a user query, returns a list of sites with passkey status.
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
          title:       site.title || result.title || 'Passkey-Enabled Site',
          url:         site.url,
          description: result.description || `Supports Passkey/WebAuthn. ${result.detectionMethod}`,
          category:    typeLabel,
          tags:        [],
          hasPasskey:  true,
          passkeyType: result.passkeyType,
        });
        console.log(`[Crawler] ✓ ${site.url} (${result.passkeyType})`);
      } else {
        results.push({
          title:       site.title || 'Site',
          url:         site.url,
          description: 'No Passkey/WebAuthn support detected.',
          category:    'No-Passkey',
          tags:        [],
          hasPasskey:  false,
          passkeyType: 'none',
        });
        console.log(`[Crawler] ✗ ${site.url}`);
      }
    }

    return results;
  } catch (error) {
    console.error('[Crawler] Error:', error.message);
    return [];
  }
};

/**
 * Detects whether a single URL supports passkey/WebAuthn authentication.
 * Returns { hasPasskey, passkeyType: 'native'|'third-party'|'none', ... }
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
      viewport:  { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    await injectWebAuthnInterceptor(context);

    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    const fido2Requests = [];
    page.on('request', req => {
      const u = req.url().toLowerCase();
      if (['webauthn', 'fido', 'attestation', 'assertion', 'passkey'].some(kw => u.includes(kw))) {
        fido2Requests.push(u);
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }); }
    catch (_) { console.log('[Crawler] Network still active, continuing'); }
    await page.waitForTimeout(5000);

    // === Stage: main page ===
    const staticMain = await checkForPasskeyOnPage(page);
    if (staticMain.found) {
      const s = await snapshot(page);
      const passkeyType = classifyPasskeyType(url, staticMain.signalSourceUrl);
      await browser.close();
      return buildResult(true, passkeyType, `Static: ${staticMain.method}`, s.title, s.url, 'Found on main page');
    }

    const runtimeMain = await checkRuntimeWebAuthnCall(page);
    if (runtimeMain.called) {
      const s = await snapshot(page);
      const passkeyType = classifyPasskeyType(url, runtimeMain.signalSourceUrl);
      await browser.close();
      return buildResult(true, passkeyType, `Runtime: navigator.credentials.${runtimeMain.method}() on main page`, s.title, s.url, 'WebAuthn API called on main page');
    }

    // === Stage: login page ===
    try {
      const reachedLogin = await navigateToLogin(page);
      if (reachedLogin) {
        try {
          await page.waitForLoadState('domcontentloaded', { timeout: 8000 });
          await page.waitForLoadState('networkidle',      { timeout: 5000 }).catch(() => {});
        } catch (_) {}
        await page.waitForTimeout(5000);

        const staticLogin = await checkForPasskeyOnPage(page);
        if (staticLogin.found) {
          const s = await snapshot(page);
          const passkeyType = classifyPasskeyType(url, staticLogin.signalSourceUrl);
          await browser.close();
          return buildResult(true, passkeyType, `Static: ${staticLogin.method}`, s.title, s.url, 'Found on login page');
        }

        const runtimeLogin = await checkRuntimeWebAuthnCall(page);
        if (runtimeLogin.called) {
          const s = await snapshot(page);
          const passkeyType = classifyPasskeyType(url, runtimeLogin.signalSourceUrl);
          await browser.close();
          return buildResult(true, passkeyType, `Runtime: navigator.credentials.${runtimeLogin.method}() on login page`, s.title, s.url, 'WebAuthn API called on login page');
        }

        // === Stage: after email entry ===
        try {
          const enteredEmail = await enterTestEmail(page);
          if (enteredEmail) {
            try {
              await page.waitForLoadState('domcontentloaded', { timeout: 8000 });
              await page.waitForLoadState('networkidle',      { timeout: 5000 }).catch(() => {});
            } catch (_) {}
            await page.waitForTimeout(5000);

            const staticEmail = await checkForPasskeyOnPage(page);
            if (staticEmail.found) {
              const s = await snapshot(page);
              const passkeyType = classifyPasskeyType(url, staticEmail.signalSourceUrl);
              await browser.close();
              return buildResult(true, passkeyType, `Static: ${staticEmail.method}`, s.title, s.url, 'Found after email entry');
            }

            const runtimeEmail = await checkRuntimeWebAuthnCall(page);
            if (runtimeEmail.called) {
              const s = await snapshot(page);
              const passkeyType = classifyPasskeyType(url, runtimeEmail.signalSourceUrl);
              await browser.close();
              return buildResult(true, passkeyType, `Runtime: navigator.credentials.${runtimeEmail.method}() after email entry`, s.title, s.url, 'WebAuthn API called during auth flow');
            }
          }
        } catch (e) {
          console.log('[Crawler] Email entry error:', e.message);
        }
      }
    } catch (e) {
      console.log('[Crawler] Login navigation error:', e.message);
    }

    // === Stage: network requests fallback ===
    if (fido2Requests.length > 0) {
      const s = await snapshot(page);
      // Network requests don't have a clear source URL; default to native
      await browser.close();
      return buildResult(true, 'native', 'Network: FIDO2/WebAuthn request detected', s.title, s.url, 'WebAuthn network request observed');
    }

    await browser.close();
    return { hasPasskey: false, passkeyType: 'none' };

  } catch (error) {
    if (browser) await browser.close();
    console.error(`[Crawler] Error at ${url}:`, error.message);
    return { hasPasskey: false, passkeyType: 'none', error: error.message };
  }
}
