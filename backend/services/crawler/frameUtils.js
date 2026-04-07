/**
 * Utilities for identifying and working with login-related iframes.
 *
 * Two signals mark a frame as "login-related":
 *   1. Its URL contains a known auth/account pattern.
 *   2. The <iframe> element in the parent has allow="publickey-credentials-...",
 *      which Apple and other sites use to explicitly grant WebAuthn access.
 */

const LOGIN_URL_PATTERNS = [
  'login', 'signin', 'sign-in', 'auth', 'account',
  'idmsa', 'appleid', 'identity', 'sso', 'oauth',
  'openid', 'secure', 'federation', 'id.apple',
  'accounts.google', 'connect.facebook',
];

/**
 * Returns all frames on the page that look like login/auth frames.
 * Skips the main frame (already handled by the page-level detectors).
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<import('playwright').Frame[]>}
 */
export async function getLoginFrames(page) {
  try {
    const results = [];

    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) continue;

      const url = frame.url();
      if (!url || url === 'about:blank' || url.startsWith('about:')) continue;

      const urlLower = url.toLowerCase();
      const matchedByUrl = LOGIN_URL_PATTERNS.some(p => urlLower.includes(p));

      // allow="publickey-credentials-get ..." on the <iframe> element is the
      // strongest possible hint that this frame handles WebAuthn/passkey auth.
      let matchedByAllow = false;
      try {
        matchedByAllow = await page.evaluate((frameUrl) => {
          return Array.from(document.querySelectorAll('iframe')).some(el => {
            const allow = el.getAttribute('allow') || '';
            const srcBase = (el.src || '').split('?')[0];
            return allow.includes('publickey-credentials') &&
                   srcBase.length > 0 &&
                   frameUrl.startsWith(srcBase);
          });
        }, url).catch(() => false);
      } catch (_) {}

      if (matchedByUrl || matchedByAllow) {
        const reason = matchedByAllow ? 'publickey-credentials allowed' : 'login URL pattern';
        console.log(`[FrameUtils] Login frame detected (${reason}): ${url}`);
        results.push(frame);
      }
    }

    return results;
  } catch (error) {
    console.log('[FrameUtils] Error finding login frames:', error.message);
    return [];
  }
}
