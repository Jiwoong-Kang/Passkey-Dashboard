// Debug script to test single site with detailed logging
// Usage: node test-debug-single.js [url]

import { chromium } from 'playwright';

const url = process.argv[2] || 'https://icloud.com';

console.log('='.repeat(70));
console.log('🔍 Debug Mode - Detailed Passkey Detection');
console.log('='.repeat(70));
console.log(`Testing: ${url}\n`);

async function debugPasskeyDetection() {
  const browser = await chromium.launch({ 
    headless: false,  // Show browser for debugging
    slowMo: 1000      // Slow down actions
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  console.log('Step 1: Navigate to page...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  console.log('✓ Page loaded\n');
  
  console.log('Step 2: Check for WebAuthn API...');
  const hasAPI = await page.evaluate(() => {
    return !!(window.PublicKeyCredential && navigator.credentials);
  });
  console.log(`WebAuthn API present: ${hasAPI}\n`);
  
  console.log('Step 3: Check for passkey keywords...');
  const keywordResults = await page.evaluate(() => {
    const keywords = ['passkey', 'passwordless', 'webauthn', 'fido', 'security key'];
    const bodyText = document.body?.innerText?.toLowerCase() || '';
    const htmlContent = document.documentElement?.innerHTML?.toLowerCase() || '';
    
    const found = [];
    keywords.forEach(keyword => {
      if (bodyText.includes(keyword) || htmlContent.includes(keyword)) {
        found.push(keyword);
      }
    });
    
    return found;
  });
  console.log(`Keywords found: ${keywordResults.length > 0 ? keywordResults.join(', ') : 'NONE'}\n`);
  
  console.log('Step 4: Look for login link...');
  const loginText = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('a, button'));
    const loginElements = elements.filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      return text.includes('sign in') || text.includes('log in');
    });
    return loginElements.map(el => el.textContent.trim()).slice(0, 5);
  });
  console.log(`Found ${loginText.length} login elements:`, loginText, '\n');
  
  console.log('Step 5: Try clicking login...');
  try {
    const loginButton = page.getByText(/sign in|log in/i).first();
    if (await loginButton.count() > 0) {
      await loginButton.click();
      console.log('✓ Clicked login button');
      
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      await page.waitForTimeout(3000);
      console.log('✓ Login page loaded\n');
      
      console.log('Step 6: Check login page for passkey...');
      
      const loginPageKeywords = await page.evaluate(() => {
        const keywords = ['passkey', 'passwordless', 'webauthn', 'fido', 'security key'];
        const bodyText = document.body?.innerText?.toLowerCase() || '';
        const htmlContent = document.documentElement?.innerHTML?.toLowerCase() || '';
        
        const found = [];
        keywords.forEach(keyword => {
          if (bodyText.includes(keyword) || htmlContent.includes(keyword)) {
            found.push(keyword);
          }
        });
        
        return found;
      });
      console.log(`Login page keywords: ${loginPageKeywords.length > 0 ? loginPageKeywords.join(', ') : 'NONE'}\n`);
      
      // Take screenshot for inspection
      await page.screenshot({ path: 'debug-login-page.png', fullPage: true });
      console.log('✓ Screenshot saved: debug-login-page.png\n');
      
      // Print visible text
      console.log('Step 7: Visible text on login page:');
      const visibleText = await page.evaluate(() => {
        return document.body?.innerText || '';
      });
      console.log(visibleText.substring(0, 500), '...\n');
      
    } else {
      console.log('✗ No login button found\n');
    }
  } catch (error) {
    console.log(`✗ Error: ${error.message}\n`);
  }
  
  console.log('Press Ctrl+C to close browser and exit...');
  
  // Keep browser open for manual inspection
  await page.waitForTimeout(60000);
  await browser.close();
}

debugPasskeyDetection()
  .then(() => {
    console.log('\nDebug complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
