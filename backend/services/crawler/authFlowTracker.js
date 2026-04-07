import { checkForPasskeyOnPage }               from './staticDetector.js';
import { checkRuntimeWebAuthnCall }             from './runtimeDetector.js';
import { enterTestEmail }                       from './emailInteractor.js';
import { getLoginFrames }                       from './frameUtils.js';

/**
 * Patterns for "next step" buttons that appear inside multi-step login flows.
 * These are intentionally different from the initial "Sign in" patterns used
 * by loginNavigator — they target options that show up AFTER the first click.
 */
const AUTH_STEP_PATTERNS = [
  /^continue$/i,
  /^next$/i,
  /^proceed$/i,
  /use email/i,
  /use password/i,
  /sign in with/i,
  /log in with/i,
  /try another way/i,
  /other (sign-in )?options/i,
  /personal account/i,
  /work or school/i,
];

const LOGIN_FORM_SELECTOR = 'input[type="email"], input[type="text"], input[type="password"]';

/**
 * Collects all visible "next auth step" button/link candidates from the
 * main page and any login-related iframes.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<Array<{el: Locator, key: string}>>}
 */
async function findAuthStepCandidates(page) {
  const candidates = [];
  const frames = [page.mainFrame(), ...(await getLoginFrames(page))];

  for (const frame of frames) {
    for (const role of ['button', 'link']) {
      for (const pattern of AUTH_STEP_PATTERNS) {
        try {
          const els = await frame.getByRole(role, { name: pattern }).all();
          for (const el of els) {
            if (!await el.isVisible().catch(() => false)) continue;
            const text = await el.evaluate(
              e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
            ).catch(() => '');
            candidates.push({ el, key: `${role}:${text.toLowerCase()}` });
          }
        } catch (_) {}
      }
    }
  }

  return candidates;
}

/**
 * Runs static + runtime detection at the current page state.
 * Returns a detection object or null.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<{found:boolean, method:string, signalSourceUrl:string|null}|null>}
 */
async function detect(page) {
  const s = await checkForPasskeyOnPage(page);
  if (s.found) return { found: true, method: s.method, signalSourceUrl: s.signalSourceUrl };

  const r = await checkRuntimeWebAuthnCall(page);
  if (r.called) {
    return {
      found: true,
      method: `Runtime: navigator.credentials.${r.method}()`,
      signalSourceUrl: r.signalSourceUrl,
    };
  }

  return null;
}

/**
 * Starting from a login surface, advances through multi-step auth flows and
 * checks for passkey signals after each step.
 *
 * Steps performed:
 *   1. Try email entry first (most common next step after login page loads)
 *   2. Look for "Continue / Next / Sign in with …" candidates
 *   3. Click each and re-run detectors
 *
 * @param {import('playwright').Page} page
 * @param {number} maxSteps   Maximum number of additional steps to attempt
 * @returns {Promise<{found:boolean, method:string, signalSourceUrl:string|null}|null>}
 */
export async function advanceAuthFlow(page, maxSteps = 4) {
  // Step 0: try email entry right away (common first step on login pages)
  try {
    const emailEntered = await enterTestEmail(page);
    if (emailEntered) {
      try { await page.waitForLoadState('domcontentloaded', { timeout: 8000 }); } catch (_) {}
      await page.waitForTimeout(3000);

      const result = await detect(page);
      if (result) {
        console.log(`[AuthFlowTracker] Found after email entry: ${result.method}`);
        return result;
      }
    }
  } catch (_) {}

  // Steps 1–N: click "Continue / Next / …" candidates
  const clicked = new Set();

  for (let step = 1; step <= maxSteps; step++) {
    const candidates = (await findAuthStepCandidates(page)).filter(c => !clicked.has(c.key));
    if (candidates.length === 0) break;

    const candidate = candidates[0];
    clicked.add(candidate.key);
    console.log(`[AuthFlowTracker] Step ${step}: clicking "${candidate.key}"`);

    try {
      await candidate.el.click({ timeout: 5000 });
      try { await page.waitForLoadState('domcontentloaded', { timeout: 8000 }); } catch (_) {}
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log(`[AuthFlowTracker] Click failed: ${e.message}`);
      continue;
    }

    // If a form appeared after the click, try filling email again
    try {
      if (await page.locator(LOGIN_FORM_SELECTOR).count() > 0) {
        const emailEntered = await enterTestEmail(page);
        if (emailEntered) {
          try { await page.waitForLoadState('domcontentloaded', { timeout: 8000 }); } catch (_) {}
          await page.waitForTimeout(3000);
        }
      }
    } catch (_) {}

    const result = await detect(page);
    if (result) {
      console.log(`[AuthFlowTracker] Found at step ${step}: ${result.method}`);
      return result;
    }
  }

  return null;
}
