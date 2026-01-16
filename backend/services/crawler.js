// Passkey/WebAuthn Detection Crawler
// Detects websites that support FIDO2/WebAuthn/Passkey authentication
// Using Playwright for better stability and iframe handling

import { chromium } from 'playwright';

/**
 * Main crawling function - searches for passkey-enabled websites
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of passkey-enabled links
 */
export const crawlWeb = async (query) => {
  console.log(`[Crawler] Starting passkey detection for query: ${query}`);
  
  try {
    // Search for websites related to the query
    const searchResults = await searchForSites(query);
    
    // Verify each site for passkey support
    const verifiedSites = [];
    
    for (const site of searchResults.slice(0, 5)) { // Limit to 5 sites for speed
      console.log(`[Crawler] Checking ${site.url}...`);
      
      const result = await detectPasskey(site.url);
      
      if (result.hasPasskey) {
        verifiedSites.push({
          title: site.title || result.title || 'Passkey-Enabled Site',
          url: site.url,
          description: result.description || `Supports Passkey/WebAuthn authentication. ${result.detectionMethod}`,
          category: 'Passkey-Enabled',
          tags: ['passkey', 'webauthn', 'fido2', 'passwordless', query.toLowerCase()]
        });
        
        console.log(`[Crawler] ✓ Found passkey support at ${site.url}`);
      } else {
        console.log(`[Crawler] ✗ No passkey support at ${site.url}`);
      }
    }
    
    console.log(`[Crawler] Completed. Found ${verifiedSites.length} passkey-enabled sites.`);
    return verifiedSites;
    
  } catch (error) {
    console.error('[Crawler] Error:', error.message);
    return [];
  }
};

/**
 * Convert search query to URLs for crawling
 * @param {string} query - Search query (domain name or URL)
 * @returns {Promise<Array>} - Array of URLs to check
 */
async function searchForSites(query) {
  const results = [];
  
  // Clean up the query
  const cleanQuery = query.trim().toLowerCase();
  
  // Check if query is already a URL
  if (cleanQuery.startsWith('http://') || cleanQuery.startsWith('https://')) {
    try {
      const url = new URL(cleanQuery);
      results.push({
        title: url.hostname,
        url: cleanQuery
      });
      return results;
    } catch (e) {
      // Invalid URL, treat as domain name
    }
  }
  
  // Extract domain name from query (remove spaces, special chars)
  let domain = cleanQuery
    .replace(/\s+/g, '')  // Remove spaces
    .replace(/[^a-z0-9.-]/g, '');  // Keep only alphanumeric, dots, hyphens
  
  // Remove common prefixes if present
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');
  
  // Generate title (capitalize first letter of each word)
  const title = query
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Try multiple URL variations
  const urlVariations = [
    `https://www.${domain}.com`,
    `https://${domain}.com`,
    `https://www.${domain}`,
    `https://${domain}`
  ];
  
  // Add unique variations only
  const uniqueUrls = [...new Set(urlVariations)];
  
  for (const url of uniqueUrls) {
    results.push({
      title: title,
      url: url
    });
  }
  
  console.log(`[Crawler] Generated ${results.length} URL variations for query: "${query}"`);
  return results;
}

/**
 * Detect passkey support on a specific URL
 * @param {string} url - URL to check
 * @returns {Promise<Object>} - Detection result
 */
export async function detectPasskey(url) {
  let browser;
  
  try {
    // Launch Playwright browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create browser context
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Set longer timeout
    page.setDefaultTimeout(30000);
    
    // Monitor network requests for FIDO2/WebAuthn endpoints
    const fido2Requests = [];
    page.on('request', request => {
      const requestUrl = request.url().toLowerCase();
      if (requestUrl.includes('webauthn') || 
          requestUrl.includes('fido') || 
          requestUrl.includes('attestation') ||
          requestUrl.includes('assertion') ||
          requestUrl.includes('passkey')) {
        fido2Requests.push(requestUrl);
      }
    });
    
    // Navigate to the page with Playwright's smart waiting
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',  // Playwright handles this better
      timeout: 30000 
    });
    
    // Wait for network to be idle (Playwright's improved version)
    try {
      await page.waitForLoadState('networkidle', { timeout: 8000 });
    } catch (e) {
      console.log('[Crawler] Network still active, continuing anyway');
    }
    
    // Additional wait for dynamic content (ethical crawling: 5 seconds)
    await page.waitForTimeout(5000);
    
    // First check: Current page
    let result = await checkForPasskeyOnPage(page);
    
    if (result.found) {
      const title = await page.title();
      await browser.close();
      return {
        hasPasskey: true,
        detectionMethod: `Detected via ${result.method}`,
        title: title,
        description: `Found passkey support on main page`
      };
    }
    
    // Second check: Try to navigate to login page
    try {
      const loginLinkFound = await navigateToLogin(page);
      
      if (loginLinkFound) {
        // Playwright's smart waiting - wait for network idle after navigation
        try {
          await page.waitForLoadState('domcontentloaded', { timeout: 8000 });
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        } catch (e) {
          console.log('[Crawler] Page still loading, continuing');
        }
        
        // Additional wait for dynamic content (ethical crawling: 5 seconds)
        await page.waitForTimeout(5000);
        
        // Check for passkey on login page
        result = await checkForPasskeyOnPage(page);
        
        if (result.found) {
          const title = await page.title();
          await browser.close();
          return {
            hasPasskey: true,
            detectionMethod: `Detected via ${result.method} on login page`,
            title: title,
            description: `Found passkey support on login page`
          };
        }
          
        // Third check: Try entering test email
        try {
          const emailEntered = await enterTestEmail(page);
          
          if (emailEntered) {
            // Wait for navigation and network idle
            try {
              await page.waitForLoadState('domcontentloaded', { timeout: 8000 });
              await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
            } catch (e) {
              console.log('[Crawler] Page still loading after email');
            }
            
            // Additional wait (ethical crawling: 5 seconds)
            await page.waitForTimeout(5000);
            
            // Check for passkey
            result = await checkForPasskeyOnPage(page);
            
            if (result.found) {
              const title = await page.title();
              await browser.close();
              return {
                hasPasskey: true,
                detectionMethod: `Detected via ${result.method} after email entry`,
                title: title,
                description: `Found passkey support in authentication flow`
              };
            }
          }
        } catch (emailError) {
          console.log(`[Crawler] Email entry error at ${url}:`, emailError.message);
        }
      }
    } catch (navError) {
      console.log(`[Crawler] Navigation error at ${url}:`, navError.message);
    }
    
    // Check network requests
    if (fido2Requests.length > 0) {
      await browser.close();
      return {
        hasPasskey: true,
        detectionMethod: 'Detected via network requests',
        title: await page.title(),
        description: `Found FIDO2/WebAuthn network requests`
      };
    }
    
    await browser.close();
    return { hasPasskey: false };
    
  } catch (error) {
    if (browser) await browser.close();
    console.error(`[Crawler] Error detecting passkey at ${url}:`, error.message);
    return { hasPasskey: false, error: error.message };
  }
}

/**
 * Check for passkey indicators on the current page
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<Object>} - Detection result
 */
async function checkForPasskeyOnPage(page) {
  try {
    // Playwright automatically waits for elements, but add delay for dynamic content (ethical crawling)
    await page.waitForTimeout(5000);
    
    // Ensure body is loaded (Playwright handles this better)
    try {
      await page.waitForSelector('body', { state: 'attached', timeout: 3000 });
    } catch (e) {
      // Continue anyway
    }
    
    // Method 1: Check for WebAuthn JavaScript API
    const hasWebAuthnAPI = await page.evaluate(() => {
      return !!(window.PublicKeyCredential && 
                navigator.credentials && 
                navigator.credentials.create);
    }).catch(() => false);
    
    if (hasWebAuthnAPI) {
      // Check if it's actually being used (not just available)
      const hasWebAuthnCode = await page.evaluate(() => {
        try {
          const scripts = Array.from(document.querySelectorAll('script'));
          return scripts.some(script => {
            const content = script.textContent || '';
            return content.includes('navigator.credentials') ||
                   content.includes('PublicKeyCredential') ||
                   content.includes('webauthn');
          });
        } catch (e) {
          return false;
        }
      }).catch(() => false);
      
      if (hasWebAuthnCode) {
        return { found: true, method: 'WebAuthn API usage' };
      }
    }
    
    // Method 2: Check for passkey-related keywords in text and HTML
    const hasKeywords = await page.evaluate(() => {
      try {
        const keywords = [
          'passkey', 'passwordless', 'webauthn', 'fido',
          'biometric', 'face id', 'touch id', 'windows hello',
          'security key', 'authenticator', 'use your passkey',
          'sign in with passkey', 'create a passkey'
        ];
        
        const bodyText = document.body?.innerText?.toLowerCase() || '';
        const htmlContent = document.documentElement?.innerHTML?.toLowerCase() || '';
        
        return keywords.some(keyword => 
          bodyText.includes(keyword) || htmlContent.includes(keyword)
        );
      } catch (e) {
        return false;
      }
    }).catch(() => false);
    
    if (hasKeywords) {
      return { found: true, method: 'passkey keywords' };
    }
    
    // Method 3: Check for passkey buttons or links
    const passkeyElements = await page.evaluate(() => {
      try {
        const textPatterns = ['passkey', 'passwordless', 'security key', 'biometric', 'webauthn'];
        
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        return buttons.some(el => {
          const text = el.textContent?.toLowerCase() || '';
          const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
          const title = el.getAttribute('title')?.toLowerCase() || '';
          
          return textPatterns.some(pattern => 
            text.includes(pattern) || ariaLabel.includes(pattern) || title.includes(pattern)
          );
        });
      } catch (e) {
        return false;
      }
    }).catch(() => false);
    
    if (passkeyElements) {
      return { found: true, method: 'passkey UI elements' };
    }
    
    return { found: false };
    
  } catch (error) {
    console.error('[Crawler] Error checking page:', error.message);
    return { found: false };
  }
}

/**
 * Navigate to login page
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<boolean>} - True if navigation successful
 */
async function navigateToLogin(page) {
  try {
    const currentUrl = page.url();
    const baseUrl = new URL(currentUrl).origin;
    
    // Method 1: Use Playwright's native click (follows redirects automatically)
    const loginPatterns = [
      /sign in/i, 
      /log in/i, 
      /login/i,
      /get started/i,
      /account/i
    ];
    
    for (const pattern of loginPatterns) {
      try {
        // Find visible login link or button
        const loginElement = page.getByRole('link', { name: pattern }).first();
        
        if (await loginElement.count() > 0 && await loginElement.isVisible()) {
          console.log(`[Crawler] Found login link with pattern: ${pattern}`);
          
          // Click and automatically follow redirects
          await loginElement.click({ timeout: 5000 });
          
          // Wait for navigation (Playwright follows redirects automatically)
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
          await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(5000);  // Ethical crawling: 5 seconds between pages
          
          console.log(`[Crawler] Navigated to: ${page.url()}`);
          return true;
        }
      } catch (e) {
        // Try next pattern
        continue;
      }
    }
    
    // Method 2: Try finding button instead of link
    for (const pattern of loginPatterns) {
      try {
        const loginButton = page.getByRole('button', { name: pattern }).first();
        
        if (await loginButton.count() > 0 && await loginButton.isVisible()) {
          console.log(`[Crawler] Found login button with pattern: ${pattern}`);
          
          await loginButton.click({ timeout: 5000 });
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
          await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(5000);  // Ethical crawling: 5 seconds between pages
          
          console.log(`[Crawler] Navigated to: ${page.url()}`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Method 3: Find any link with href containing login
    try {
      const loginLinks = await page.locator('a[href*="login"], a[href*="signin"]').all();
      
      for (const link of loginLinks) {
        if (await link.isVisible()) {
          console.log(`[Crawler] Found login href link`);
          
          await link.click({ timeout: 5000 });
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
          await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(5000);  // Ethical crawling: 5 seconds between pages
          
          console.log(`[Crawler] Navigated to: ${page.url()}`);
          return true;
        }
      }
    } catch (e) {
      console.log('[Crawler] href method failed:', e.message);
    }
    
    // Method 4: Try common login paths with full redirect support
    const commonLoginPaths = [
      '/login', 
      '/signin', 
      '/sign-in', 
      '/auth/login', 
      '/account/login',
      '/accounts/login',
      '/user/login',
      '/auth/signin',
      '/authentication/login'
    ];
    
    for (const path of commonLoginPaths) {
      try {
        const testUrl = `${baseUrl}${path}`;
        console.log(`[Crawler] Trying path: ${testUrl}`);
        
        // goto automatically follows ALL redirects (cross-domain too)
        const response = await page.goto(testUrl, { 
          waitUntil: 'domcontentloaded', 
          timeout: 15000 
        });
        
        // Check if we got a valid page (not 404/500)
        if (response && response.status() < 400) {
          console.log(`[Crawler] Success! Final URL: ${page.url()}`);
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(5000);  // Ethical crawling: 5 seconds between pages
          return true;
        }
      } catch (e) {
        // Try next path
        continue;
      }
    }
    
    console.log('[Crawler] Could not navigate to login');
    return false;
  } catch (error) {
    console.log('[Crawler] Navigate to login error:', error.message);
    return false;
  }
}

/**
 * Enter test email in login form
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<boolean>} - True if email entered successfully
 */
async function enterTestEmail(page) {
  try {
    // Try to find email/username input using Playwright's smart selectors
    const emailSelectors = [
      'input[type="email"]',
      'input[name*="email" i]',
      'input[name*="username" i]',
      'input[placeholder*="email" i]',
      'input[id*="email" i]'
    ];
    
    for (const selector of emailSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.count() > 0) {
          // Fill the input (Playwright handles events automatically)
          await input.fill('test@example.com', { timeout: 3000 });
          
          // Wait a bit for validation
          await page.waitForTimeout(1000);
          
          // Try to find and click next/continue button
          const buttonPatterns = ['next', 'continue', 'submit', 'proceed'];
          
          for (const pattern of buttonPatterns) {
            try {
              const button = page.getByRole('button', { name: new RegExp(pattern, 'i') }).first();
              if (await button.count() > 0) {
                await Promise.all([
                  page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {}),
                  button.click({ timeout: 3000 }).catch(() => {})
                ]);
                return true;
              }
            } catch (e) {
              // Try next pattern
              continue;
            }
          }
          
          // Also try submit button
          try {
            const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
            if (await submitBtn.count() > 0) {
              await Promise.all([
                page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {}),
                submitBtn.click({ timeout: 3000 }).catch(() => {})
              ]);
            }
          } catch (e) {
            // No submit button
          }
          
          return true;
        }
      } catch (e) {
        // Try next selector
        continue;
      }
    }
    
    return false;
  } catch (error) {
    console.log('[Crawler] Enter email error:', error.message);
    return false;
  }
}
