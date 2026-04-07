import { getLoginFrames } from './frameUtils.js';

/**
 * Runtime detector — intercepts actual navigator.credentials.get / .create calls.
 * This is the "2nd pass" check: reliable even for bundled/minified code, because
 * we hook the API before the page's own scripts run via addInitScript().
 *
 * The interceptor is injected at the context level, so it runs in ALL frames
 * (including iframes), and each frame's window gets its own __webauthnCalled flag.
 */

/**
 * Must be called once on the BrowserContext before any page navigation.
 * Wraps navigator.credentials in every frame so any real WebAuthn call sets a flag.
 *
 * @param {import('playwright').BrowserContext} context
 */
export async function injectWebAuthnInterceptor(context) {
  await context.addInitScript(() => {
    try {
      const _origGet    = navigator.credentials.get.bind(navigator.credentials);
      const _origCreate = navigator.credentials.create.bind(navigator.credentials);

      navigator.credentials.get = function (options) {
        window.__webauthnCalled  = true;
        window.__webauthnMethod  = 'get';
        window.__webauthnOptions = JSON.stringify(options ?? {});
        return _origGet(options);
      };

      navigator.credentials.create = function (options) {
        window.__webauthnCalled  = true;
        window.__webauthnMethod  = 'create';
        window.__webauthnOptions = JSON.stringify(options ?? {});
        return _origCreate(options);
      };
    } catch (_) {
      // credentials API unavailable in this context — no-op
    }
  });
}

/**
 * Reads the flag set by the interceptor to check whether a WebAuthn call happened.
 * Checks the main page first, then falls back to login-related iframes.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<{called: boolean, method: string|null, options: string|null, source: string}>}
 */
export async function checkRuntimeWebAuthnCall(page) {
  // --- Check main page window ---
  const mainResult = await readWebAuthnFlag(page.mainFrame());
  if (mainResult.called) {
    console.log(`[RuntimeDetector] ✓ navigator.credentials.${mainResult.method}() called on main page`);
    return { ...mainResult, source: 'main page', signalSourceUrl: page.url() };
  }

  // --- Fallback: check login-related iframes ---
  const loginFrames = await getLoginFrames(page);
  for (const frame of loginFrames) {
    try {
      const frameResult = await readWebAuthnFlag(frame);
      if (frameResult.called) {
        console.log(`[RuntimeDetector] ✓ navigator.credentials.${frameResult.method}() called in login iframe: ${frame.url()}`);
        return { ...frameResult, source: `login iframe: ${frame.url()}`, signalSourceUrl: frame.url() };
      }
    } catch (_) {
      continue;
    }
  }

  return { called: false, method: null, options: null, source: null, signalSourceUrl: null };
}

/**
 * Reads __webauthnCalled from a specific frame's window.
 *
 * @param {import('playwright').Frame} frame
 * @returns {Promise<{called: boolean, method: string|null, options: string|null}>}
 */
async function readWebAuthnFlag(frame) {
  try {
    return await frame.evaluate(() => ({
      called:  !!window.__webauthnCalled,
      method:  window.__webauthnMethod  ?? null,
      options: window.__webauthnOptions ?? null,
    }));
  } catch (_) {
    return { called: false, method: null, options: null };
  }
}
