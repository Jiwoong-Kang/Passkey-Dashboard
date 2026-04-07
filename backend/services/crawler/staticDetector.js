/**
 * Static detector — inspects the current page DOM/scripts/text for passkey indicators.
 * This is the "1st pass" check: fast but limited to what is visible in the page source.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<{found: boolean, method: string|null}>}
 */
export async function checkForPasskeyOnPage(page) {
  try {
    await page.waitForTimeout(5000);

    try {
      await page.waitForSelector('body', { state: 'attached', timeout: 3000 });
    } catch (_) {
      // Continue anyway if body takes too long
    }

    // --- Method 1: WebAuthn inline script usage ---
    const hasWebAuthnAPI = await page.evaluate(() => {
      return !!(window.PublicKeyCredential &&
                navigator.credentials &&
                navigator.credentials.create);
    }).catch(() => false);

    if (hasWebAuthnAPI) {
      const hasWebAuthnCode = await page.evaluate(() => {
        try {
          return Array.from(document.querySelectorAll('script')).some(script => {
            const content = script.textContent || '';
            return content.includes('navigator.credentials') ||
                   content.includes('PublicKeyCredential') ||
                   content.includes('webauthn');
          });
        } catch (_) {
          return false;
        }
      }).catch(() => false);

      if (hasWebAuthnCode) {
        return { found: true, method: 'WebAuthn API usage in inline scripts' };
      }
    }

    // --- Method 2: Passkey-related keywords in visible text / HTML ---
    const hasKeywords = await page.evaluate(() => {
      try {
        const keywords = [
          'passkey', 'passwordless', 'webauthn', 'fido',
          'biometric', 'face id', 'touch id', 'windows hello',
          'security key', 'authenticator', 'use your passkey',
          'sign in with passkey', 'create a passkey',
        ];
        const bodyText  = document.body?.innerText?.toLowerCase() || '';
        const htmlContent = document.documentElement?.innerHTML?.toLowerCase() || '';
        return keywords.some(kw => bodyText.includes(kw) || htmlContent.includes(kw));
      } catch (_) {
        return false;
      }
    }).catch(() => false);

    if (hasKeywords) {
      return { found: true, method: 'passkey keywords in page content' };
    }

    // --- Method 3: Passkey-related buttons or links ---
    const hasPasskeyElements = await page.evaluate(() => {
      try {
        const patterns = ['passkey', 'passwordless', 'security key', 'biometric', 'webauthn'];
        return Array.from(document.querySelectorAll('button, a, [role="button"]')).some(el => {
          const text      = el.textContent?.toLowerCase() || '';
          const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
          const title     = el.getAttribute('title')?.toLowerCase() || '';
          return patterns.some(p => text.includes(p) || ariaLabel.includes(p) || title.includes(p));
        });
      } catch (_) {
        return false;
      }
    }).catch(() => false);

    if (hasPasskeyElements) {
      return { found: true, method: 'passkey UI elements (button/link)' };
    }

    return { found: false, method: null };

  } catch (error) {
    console.error('[StaticDetector] Error:', error.message);
    return { found: false, method: null };
  }
}
