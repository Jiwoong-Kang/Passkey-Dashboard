const EMAIL_SELECTORS = [
  'input[type="email"]',
  'input[name*="email" i]',
  'input[name*="username" i]',
  'input[placeholder*="email" i]',
  'input[id*="email" i]',
];

const SUBMIT_BUTTON_PATTERNS = ['next', 'continue', 'submit', 'proceed'];

/**
 * Fills in a test email address and submits the login form to advance
 * the authentication flow to the next step (where passkey prompts often appear).
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>} True if email was entered and form was submitted
 */
export async function enterTestEmail(page) {
  try {
    for (const selector of EMAIL_SELECTORS) {
      try {
        const input = page.locator(selector).first();
        if (await input.count() === 0) continue;

        await input.fill('test@example.com', { timeout: 3000 });
        await page.waitForTimeout(1000);

        // Try labelled submit buttons first
        for (const pattern of SUBMIT_BUTTON_PATTERNS) {
          try {
            const btn = page.getByRole('button', { name: new RegExp(pattern, 'i') }).first();
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
          const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
          if (await submitBtn.count() > 0) {
            await Promise.all([
              page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {}),
              submitBtn.click({ timeout: 3000 }).catch(() => {}),
            ]);
            console.log('[EmailInteractor] Submitted form with type=submit button');
          }
        } catch (_) {
          // No submit button found — email was still filled
        }

        return true;

      } catch (_) {
        continue;
      }
    }

    console.log('[EmailInteractor] No email input found on page');
    return false;

  } catch (error) {
    console.log('[EmailInteractor] Error:', error.message);
    return false;
  }
}
