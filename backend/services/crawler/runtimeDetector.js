/**
 * Runtime detector — intercepts actual navigator.credentials.get / .create calls.
 * This is the "2nd pass" check: reliable even for bundled/minified code, because
 * we hook the API before the page's own scripts run via addInitScript().
 */

/**
 * Must be called once on the BrowserContext before any page navigation.
 * Wraps navigator.credentials so that any real WebAuthn call sets a flag we can read later.
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
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<{called: boolean, method: string|null, options: string|null}>}
 */
export async function checkRuntimeWebAuthnCall(page) {
  try {
    const result = await page.evaluate(() => ({
      called:  !!window.__webauthnCalled,
      method:  window.__webauthnMethod  ?? null,
      options: window.__webauthnOptions ?? null,
    }));

    if (result.called) {
      console.log(`[RuntimeDetector] ✓ navigator.credentials.${result.method}() was called`);
    }

    return result;
  } catch (_) {
    return { called: false, method: null, options: null };
  }
}
