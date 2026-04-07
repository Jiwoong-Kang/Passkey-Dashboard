import { getLoginFrames } from './frameUtils.js';

/**
 * Static detector — inspects the current page DOM/scripts/text for passkey indicators.
 * Checks the top-level page first, then falls back to login-related iframes.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<{found: boolean, method: string|null}>}
 */
export async function checkForPasskeyOnPage(page) {
  try {
    await page.waitForTimeout(5000);

    try {
      await page.waitForSelector('body', { state: 'attached', timeout: 3000 });
    } catch (_) {}

    // --- Check main page ---
    const mainResult = await inspectFrame(page.mainFrame());
    if (mainResult.found) {
      console.log(`[StaticDetector] Main page: ${mainResult.log}`);
      return { found: true, method: mainResult.method };
    }

    // --- Fallback: check login-related iframes ---
    const loginFrames = await getLoginFrames(page);
    for (const frame of loginFrames) {
      try {
        const frameResult = await inspectFrame(frame);
        if (frameResult.found) {
          console.log(`[StaticDetector] Login iframe (${frame.url()}): ${frameResult.log}`);
          return { found: true, method: `${frameResult.method} [in login iframe]` };
        }
      } catch (_) {
        continue;
      }
    }

    return { found: false, method: null };

  } catch (error) {
    console.error('[StaticDetector] Error:', error.message);
    return { found: false, method: null };
  }
}

/**
 * Inspects a single frame (main page or iframe) for passkey/WebAuthn signals.
 *
 * @param {import('playwright').Frame} frame
 * @returns {Promise<{found: boolean, method: string|null, log: string}>}
 */
async function inspectFrame(frame) {
  // --- Method 1: WebAuthn keyword in inline <script> ---
  const webAuthnScriptMatch = await frame.evaluate(() => {
    try {
      for (const script of Array.from(document.querySelectorAll('script'))) {
        const content = script.textContent || '';
        if (content.includes('navigator.credentials')) return 'navigator.credentials';
        if (content.includes('PublicKeyCredential'))   return 'PublicKeyCredential';
        if (content.includes('webauthn'))              return 'webauthn';
      }
      return null;
    } catch (_) {
      return null;
    }
  }).catch(() => null);

  if (webAuthnScriptMatch) {
    const log = `Matched inline script signal: ${webAuthnScriptMatch}`;
    return { found: true, method: `WebAuthn API usage in inline scripts (${webAuthnScriptMatch})`, log };
  }

  // --- Method 2: Passkey-related keywords in visible text / HTML ---
  const keywordMatch = await frame.evaluate(() => {
    try {
      const keywords = [
        'passkey', 'passwordless', 'webauthn', 'fido',
        'biometric', 'face id', 'touch id', 'windows hello',
        'security key', 'authenticator', 'use your passkey',
        'sign in with passkey', 'create a passkey',
      ];
      const bodyText    = document.body?.innerText?.toLowerCase() || '';
      const htmlContent = document.documentElement?.innerHTML?.toLowerCase() || '';
      return keywords.find(kw => bodyText.includes(kw) || htmlContent.includes(kw)) || null;
    } catch (_) {
      return null;
    }
  }).catch(() => null);

  if (keywordMatch) {
    const log = `Matched page keyword: "${keywordMatch}"`;
    return { found: true, method: `passkey keywords in page content (${keywordMatch})`, log };
  }

  // --- Method 3: autocomplete="webauthn" on any input (very reliable signal) ---
  const hasWebAuthnInput = await frame.evaluate(() => {
    try {
      return Array.from(document.querySelectorAll('input')).some(el => {
        const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
        return ac.includes('webauthn');
      });
    } catch (_) {
      return false;
    }
  }).catch(() => false);

  if (hasWebAuthnInput) {
    const log = 'Found input with autocomplete="...webauthn..."';
    return { found: true, method: 'autocomplete=webauthn on input field', log };
  }

  // --- Method 4: Passkey-related buttons or links ---
  const uiMatch = await frame.evaluate(() => {
    try {
      const patterns = ['passkey', 'passwordless', 'security key', 'biometric', 'webauthn'];
      for (const el of Array.from(document.querySelectorAll('button, a, [role="button"]'))) {
        const text      = el.textContent?.toLowerCase() || '';
        const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
        const title     = el.getAttribute('title')?.toLowerCase() || '';
        const matched   = patterns.find(p => text.includes(p) || ariaLabel.includes(p) || title.includes(p));
        if (matched) {
          return {
            matchedPattern: matched,
            text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
            ariaLabel: el.getAttribute('aria-label'),
            title: el.getAttribute('title'),
            tagName: el.tagName.toLowerCase(),
          };
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }).catch(() => null);

  if (uiMatch) {
    const log = `Matched UI element: tag=${uiMatch.tagName} pattern=${uiMatch.matchedPattern} text="${uiMatch.text}" aria-label=${uiMatch.ariaLabel ?? 'n/a'}`;
    return { found: true, method: `passkey UI elements (${uiMatch.tagName}, ${uiMatch.matchedPattern})`, log };
  }

  return { found: false, method: null, log: '' };
}
