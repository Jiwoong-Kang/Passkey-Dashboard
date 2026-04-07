import { checkForPasskeyOnPage }   from './staticDetector.js';
import { checkRuntimeWebAuthnCall } from './runtimeDetector.js';

/**
 * Wraps an async action and watches for any new page (popup or new tab)
 * that the action might open.  If a new page appears, runs passkey detectors
 * on it and returns the result.
 *
 * Usage pattern:
 *   const result = await withPopupWatch(context, async () => {
 *     await someButton.click();
 *   });
 *
 * @param {import('playwright').BrowserContext} context
 * @param {() => Promise<void>} action  - the action that may open a popup
 * @returns {Promise<{found:boolean, method:string|null, signalSourceUrl:string|null, newPage: import('playwright').Page|null}>}
 */
export async function withPopupWatch(context, action) {
  // Register the listener BEFORE the action so we don't miss the event
  const pagePromise = context.waitForEvent('page', { timeout: 8000 }).catch(() => null);

  await action();

  const newPage = await pagePromise;
  if (!newPage) {
    return { found: false, method: null, signalSourceUrl: null, newPage: null };
  }

  console.log(`[PopupHandler] New page/popup opened: ${newPage.url()}`);

  try {
    try { await newPage.waitForLoadState('domcontentloaded', { timeout: 10000 }); } catch (_) {}
    try { await newPage.waitForLoadState('networkidle',      { timeout: 5000  }); } catch (_) {}
    await newPage.waitForTimeout(3000);

    const staticResult = await checkForPasskeyOnPage(newPage);
    if (staticResult.found) {
      console.log(`[PopupHandler] Static signal found in popup: ${staticResult.method}`);
      return { found: true, method: staticResult.method, signalSourceUrl: staticResult.signalSourceUrl, newPage };
    }

    const runtimeResult = await checkRuntimeWebAuthnCall(newPage);
    if (runtimeResult.called) {
      const method = `Runtime: navigator.credentials.${runtimeResult.method}() in popup`;
      console.log(`[PopupHandler] ${method}`);
      return { found: true, method, signalSourceUrl: runtimeResult.signalSourceUrl, newPage };
    }
  } catch (e) {
    console.log(`[PopupHandler] Error inspecting popup: ${e.message}`);
  }

  return { found: false, method: null, signalSourceUrl: null, newPage };
}
