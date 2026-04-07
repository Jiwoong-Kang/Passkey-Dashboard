import { chromium } from 'playwright';

import { searchForSites }           from './crawler/urlBuilder.js';
import { checkForPasskeyOnPage }    from './crawler/staticDetector.js';
import { injectWebAuthnInterceptor, checkRuntimeWebAuthnCall } from './crawler/runtimeDetector.js';
import { navigateToLogin }          from './crawler/loginNavigator.js';
import { enterTestEmail }           from './crawler/emailInteractor.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildResult(hasPasskey, method, title, foundUrl, description) {
  return { hasPasskey, detectionMethod: method, title, description, foundAtUrl: foundUrl };
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

      results.push(result.hasPasskey ? {
        title:       site.title || result.title || 'Passkey-Enabled Site',
        url:         site.url,
        description: result.description || `Supports Passkey/WebAuthn. ${result.detectionMethod}`,
        category:    'Passkey-Enabled',
        tags:        [],
        hasPasskey:  true,
      } : {
        title:       site.title || 'Site',
        url:         site.url,
        description: 'No Passkey/WebAuthn support detected.',
        category:    'No-Passkey',
        tags:        [],
        hasPasskey:  false,
      });

      console.log(`[Crawler] ${result.hasPasskey ? '✓' : '✗'} ${site.url}`);
    }

    return results;
  } catch (error) {
    console.error('[Crawler] Error:', error.message);
    return [];
  }
};

/**
 * Detects whether a single URL supports passkey/WebAuthn authentication.
 * Detection runs in three stages:
 *   1. Static  — DOM/script/keyword scan on each page
 *   2. Runtime — checks if navigator.credentials.get/create was actually called
 *   3. Network — checks for FIDO2/WebAuthn-related network requests
 *
 * @param {string} url
 * @returns {Promise<{hasPasskey: boolean, detectionMethod?: string, ...}>}
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

    // 2nd-pass interceptor: must be injected before any page navigates
    await injectWebAuthnInterceptor(context);

    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    // Track network-level FIDO2/WebAuthn requests as a last-resort signal
    const fido2Requests = [];
    page.on('request', req => {
      const u = req.url().toLowerCase();
      if (['webauthn', 'fido', 'attestation', 'assertion', 'passkey'].some(kw => u.includes(kw))) {
        fido2Requests.push(u);
      }
    });

    // --- Navigate to target ---
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    try { await page.waitForLoadState('networkidle', { timeout: 8000 }); }
    catch (_) { console.log('[Crawler] Network still active, continuing'); }
    await page.waitForTimeout(5000);

    // === Stage: main page ===
    const staticMain = await checkForPasskeyOnPage(page);
    if (staticMain.found) {
      const s = await snapshot(page);
      await browser.close();
      return buildResult(true, `Static: ${staticMain.method}`, s.title, s.url, 'Found on main page');
    }

    const runtimeMain = await checkRuntimeWebAuthnCall(page);
    if (runtimeMain.called) {
      const s = await snapshot(page);
      await browser.close();
      return buildResult(true, `Runtime: navigator.credentials.${runtimeMain.method}() on main page`, s.title, s.url, 'WebAuthn API called on main page');
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
          await browser.close();
          return buildResult(true, `Static: ${staticLogin.method}`, s.title, s.url, 'Found on login page');
        }

        const runtimeLogin = await checkRuntimeWebAuthnCall(page);
        if (runtimeLogin.called) {
          const s = await snapshot(page);
          await browser.close();
          return buildResult(true, `Runtime: navigator.credentials.${runtimeLogin.method}() on login page`, s.title, s.url, 'WebAuthn API called on login page');
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
              await browser.close();
              return buildResult(true, `Static: ${staticEmail.method}`, s.title, s.url, 'Found after email entry');
            }

            const runtimeEmail = await checkRuntimeWebAuthnCall(page);
            if (runtimeEmail.called) {
              const s = await snapshot(page);
              await browser.close();
              return buildResult(true, `Runtime: navigator.credentials.${runtimeEmail.method}() after email entry`, s.title, s.url, 'WebAuthn API called during auth flow');
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
      await browser.close();
      return buildResult(true, 'Network: FIDO2/WebAuthn request detected', s.title, s.url, 'WebAuthn network request observed');
    }

    await browser.close();
    return { hasPasskey: false };

  } catch (error) {
    if (browser) await browser.close();
    console.error(`[Crawler] Error at ${url}:`, error.message);
    return { hasPasskey: false, error: error.message };
  }
}
