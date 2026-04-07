import { getLoginFrames } from './frameUtils.js';

const LOGIN_PATTERNS = [/sign in/i, /log in/i, /login/i, /get started/i, /account/i];

const COMMON_LOGIN_PATHS = [
  '/login', '/signin', '/sign-in',
  '/auth/login', '/account/login', '/accounts/login',
  '/user/login', '/auth/signin', '/authentication/login',
];

const LOGIN_FORM_SELECTOR = 'input[type="email"], input[type="text"], input[type="password"]';

async function getLocatorDebugInfo(locator) {
  try {
    return await locator.evaluate(el => ({
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
      href: el.getAttribute('href'),
      ariaLabel: el.getAttribute('aria-label'),
      title: el.getAttribute('title'),
      tagName: el.tagName.toLowerCase(),
    }));
  } catch (_) {
    return {
      text: '',
      href: null,
      ariaLabel: null,
      title: null,
      tagName: null,
    };
  }
}

/**
 * Tries to navigate the page to a login form using multiple strategies.
 * Returns true if a login form is reachable, false otherwise.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
export async function navigateToLogin(page) {
  try {
    // Strategy 1 & 2: click visible login link or button
    for (const role of ['link', 'button']) {
      for (const pattern of LOGIN_PATTERNS) {
        try {
          const el = page.getByRole(role, { name: pattern }).first();
          if (await el.count() > 0 && await el.isVisible()) {
            const debugInfo = await getLocatorDebugInfo(el);
            console.log(
              `[LoginNavigator] Strategy=role-search role=${role} pattern=${pattern} tag=${debugInfo.tagName} text="${debugInfo.text}" href=${debugInfo.href ?? 'n/a'} aria-label=${debugInfo.ariaLabel ?? 'n/a'}`
            );
            const urlBefore = page.url();

            await el.click({ timeout: 5000 });
            await Promise.race([
              page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {}),
              page.waitForSelector(LOGIN_FORM_SELECTOR, { timeout: 8000 }).catch(() => {}),
            ]);
            await page.waitForTimeout(3000);

            const urlAfter      = page.url();
            const hasForm       = await page.locator(LOGIN_FORM_SELECTOR).count() > 0;
            const loginFrames   = await getLoginFrames(page);
            const hasLoginFrame = loginFrames.length > 0;

            if (urlAfter !== urlBefore || hasForm || hasLoginFrame) {
              console.log(
                `[LoginNavigator] Reached login page via role-search from ${urlBefore} to ${urlAfter} (hasForm=${hasForm} hasLoginFrame=${hasLoginFrame})`
              );
              return true;
            }
          }
        } catch (_) {
          continue;
        }
      }
    }

    // Strategy 3: any anchor whose href contains "login" or "signin"
    try {
      const links = await page.locator('a[href*="login"], a[href*="signin"]').all();
      for (const link of links) {
        if (await link.isVisible()) {
          const debugInfo = await getLocatorDebugInfo(link);
          const urlBefore = page.url();
          console.log(
            `[LoginNavigator] Strategy=href-search tag=${debugInfo.tagName} text="${debugInfo.text}" href=${debugInfo.href ?? 'n/a'}`
          );
          await link.click({ timeout: 5000 });
          await Promise.race([
            page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {}),
            page.waitForSelector(LOGIN_FORM_SELECTOR, { timeout: 8000 }).catch(() => {}),
          ]);
          await page.waitForTimeout(3000);

          const urlAfter      = page.url();
          const hasForm       = await page.locator(LOGIN_FORM_SELECTOR).count() > 0;
          const loginFrames   = await getLoginFrames(page);
          const hasLoginFrame = loginFrames.length > 0;

          if (urlAfter !== urlBefore || hasForm || hasLoginFrame) {
            console.log(
              `[LoginNavigator] Reached login page via href-search from ${urlBefore} to ${urlAfter} (hasForm=${hasForm} hasLoginFrame=${hasLoginFrame})`
            );
            return true;
          }
        }
      }
    } catch (e) {
      console.log('[LoginNavigator] href strategy failed:', e.message);
    }

    // Strategy 4: try well-known login paths directly
    const baseUrl = new URL(page.url()).origin;
    for (const path of COMMON_LOGIN_PATHS) {
      try {
        const testUrl  = `${baseUrl}${path}`;
        console.log(`[LoginNavigator] Strategy=path-probe testing ${testUrl}`);
        const response = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

        if (response && response.status() < 400) {
          await Promise.race([
            page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {}),
            page.waitForSelector(LOGIN_FORM_SELECTOR, { timeout: 5000 }).catch(() => {}),
          ]);
          await page.waitForTimeout(3000);
          const hasForm       = await page.locator(LOGIN_FORM_SELECTOR).count() > 0;
          const loginFrames   = await getLoginFrames(page);
          const hasLoginFrame = loginFrames.length > 0;
          console.log(
            `[LoginNavigator] Reached login page via path-probe path=${path} finalUrl=${page.url()} status=${response.status()} hasForm=${hasForm} hasLoginFrame=${hasLoginFrame}`
          );
          return true;
        }
      } catch (_) {
        continue;
      }
    }

    console.log('[LoginNavigator] Could not find login page');
    return false;

  } catch (error) {
    console.log('[LoginNavigator] Error:', error.message);
    return false;
  }
}
