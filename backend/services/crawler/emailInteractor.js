import { getLoginFrames } from './frameUtils.js';

const EMAIL_SELECTORS = [
  'input[type="email"]',
  'input[name*="email" i]',
  'input[name*="username" i]',
  'input[placeholder*="email" i]',
  'input[id*="email" i]',
  'input[autocomplete*="email" i]',
  'input[autocomplete*="username" i]',
];

const SUBMIT_BUTTON_PATTERNS = ['next', 'continue', 'submit', 'proceed'];

/**
 * Fills in a test email address and submits the login form to advance
 * the authentication flow to the next step (where passkey prompts often appear).
 * Tries the main page first, then falls back to login-related iframes.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>} True if email was entered and form was submitted
 */
export async function enterTestEmail(page) {
  // --- Try main page first ---
  const mainResult = await fillEmailInFrame(page.mainFrame(), page);
  if (mainResult) return true;

  // --- Fallback: try login-related iframes ---
  const loginFrames = await getLoginFrames(page);
  for (const frame of loginFrames) {
    try {
      console.log(`[EmailInteractor] Trying login iframe: ${frame.url()}`);
      const frameResult = await fillEmailInFrame(frame, page);
      if (frameResult) return true;
    } catch (_) {
      continue;
    }
  }

  console.log('[EmailInteractor] No email input found on page or login iframes');
  return false;
}

/**
 * Attempts to fill email and submit within a specific frame.
 *
 * @param {import('playwright').Frame} frame
 * @param {import('playwright').Page} page  - needed for waitForLoadState
 * @returns {Promise<boolean>}
 */
async function fillEmailInFrame(frame, page) {
  for (const selector of EMAIL_SELECTORS) {
    try {
      const input = frame.locator(selector).first();
      if (await input.count() === 0) continue;

      await input.fill('test@example.com', { timeout: 3000 });
      await page.waitForTimeout(1000);

      console.log(`[EmailInteractor] Filled email using selector "${selector}" in ${frame.url() === page.url() ? 'main page' : `iframe: ${frame.url()}`}`);

      // Try labelled submit buttons first
      for (const pattern of SUBMIT_BUTTON_PATTERNS) {
        try {
          const btn = frame.getByRole('button', { name: new RegExp(pattern, 'i') }).first();
          if (await btn.count() > 0) {
            await Promise.all([
              page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {}),
              btn.click({ timeout: 3000 }).catch(() => {}),
            ]);
            console.log(`[EmailInteractor] Submitted form with "${pattern}" button`);
            return true;
          }
        } catch (_) {
          continue;
        }
      }

      // Fall back to any submit-type button
      try {
        const submitBtn = frame.locator('button[type="submit"], input[type="submit"]').first();
        if (await submitBtn.count() > 0) {
          await Promise.all([
            page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {}),
            submitBtn.click({ timeout: 3000 }).catch(() => {}),
          ]);
          console.log('[EmailInteractor] Submitted form with type=submit button');
        }
      } catch (_) {}

      return true;

    } catch (_) {
      continue;
    }
  }

  return false;
}
