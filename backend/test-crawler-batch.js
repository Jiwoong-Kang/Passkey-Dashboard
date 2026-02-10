// Batch test script for crawler - tests multiple sites from file
// Usage: node test-crawler-batch.js

import { readFileSync, writeFileSync } from 'fs';
import { detectPasskey } from './services/crawler.js';

// Helper function to convert domain to URL
function domainToUrl(query) {
  const cleanQuery = query.trim().toLowerCase();
  
  // Check if query is already a URL
  if (cleanQuery.startsWith('http://') || cleanQuery.startsWith('https://')) {
    return cleanQuery;
  }
  
  // Extract domain name from query
  let domain = cleanQuery
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9.-]/g, '');
  
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');
  
  // Check if domain already has a TLD (e.g., .com, .net, .org, .co.kr)
  const hasTLD = /\.[a-z]{2,}$/i.test(domain);
  
  // Add .com only if no TLD exists
  if (!hasTLD) {
    domain = `${domain}.com`;
  }
  
  // Return URL with www
  return `https://www.${domain}`;
}

const SITES_FILE = './test-sites2.txt';
const RESULTS_FILE = './result2.txt';

console.log('='.repeat(70));
console.log('🔍 Batch Passkey Detection Test');
console.log('='.repeat(70));

// Read sites from file
let sites = [];
try {
  const content = readFileSync(SITES_FILE, 'utf-8');
  sites = content.split('\n').filter(line => line.trim().length > 0);
  console.log(`\n✓ Loaded ${sites.length} sites from ${SITES_FILE}\n`);
} catch (error) {
  console.error(`❌ Error reading ${SITES_FILE}:`, error.message);
  process.exit(1);
}

// Test each site
async function runTests() {
  const results = [];
  let resultText = '';
  
  resultText += '='.repeat(70) + '\n';
  resultText += 'PASSKEY DETECTION TEST RESULTS\n';
  resultText += '='.repeat(70) + '\n';
  resultText += `Test Date: ${new Date().toLocaleString()}\n`;
  resultText += `Total Sites Tested: ${sites.length}\n`;
  resultText += '='.repeat(70) + '\n\n';
  
  for (let i = 0; i < sites.length; i++) {
    const domain = sites[i].trim();
    console.log(`[${i + 1}/${sites.length}] Testing: ${domain}`);
    
    try {
      // Convert domain to URL
      const url = domainToUrl(domain);
      
      console.log(`    Converted to: ${url}`);
      
      const result = await detectPasskey(url);
      
      results.push({
        url,
        hasPasskey: result.hasPasskey,
        method: result.detectionMethod || 'N/A',
        title: result.title || 'Unknown',
        foundAtUrl: result.foundAtUrl || 'N/A'
      });
      
      const status = result.hasPasskey ? '✓ PASSKEY FOUND' : '✗ NO PASSKEY';
      console.log(`    ${status}`);
      if (result.hasPasskey) {
        console.log(`    Method: ${result.detectionMethod}`);
        console.log(`    Found at: ${result.foundAtUrl}`);
      }
      console.log('');
      
    } catch (error) {
      console.error(`    ❌ Error: ${error.message}\n`);
      results.push({
        url: domain,
        hasPasskey: false,
        method: 'Error',
        error: error.message
      });
    }
  }
  
  // Generate summary
  const withPasskey = results.filter(r => r.hasPasskey);
  const withoutPasskey = results.filter(r => !r.hasPasskey);
  
  resultText += 'SUMMARY\n';
  resultText += '-'.repeat(70) + '\n';
  resultText += `Total Sites Tested: ${results.length}\n`;
  resultText += `✓ Sites with Passkey Support: ${withPasskey.length}\n`;
  resultText += `✗ Sites without Passkey Support: ${withoutPasskey.length}\n`;
  resultText += `Success Rate: ${((withPasskey.length / results.length) * 100).toFixed(1)}%\n`;
  resultText += '='.repeat(70) + '\n\n';
  
  // Sites with passkey
  if (withPasskey.length > 0) {
    resultText += 'SITES WITH PASSKEY SUPPORT:\n';
    resultText += '-'.repeat(70) + '\n';
    withPasskey.forEach((result, index) => {
      resultText += `${index + 1}. ${result.url}\n`;
      resultText += `   Title: ${result.title}\n`;
      resultText += `   Detection Method: ${result.method}\n`;
      resultText += `   Passkey Found At: ${result.foundAtUrl}\n`;
      resultText += '\n';
    });
    resultText += '\n';
  }
  
  // Sites without passkey
  if (withoutPasskey.length > 0) {
    resultText += 'SITES WITHOUT PASSKEY SUPPORT:\n';
    resultText += '-'.repeat(70) + '\n';
    withoutPasskey.forEach((result, index) => {
      resultText += `${index + 1}. ${result.url}\n`;
      if (result.error) {
        resultText += `   Error: ${result.error}\n`;
      }
      resultText += '\n';
    });
  }
  
  resultText += '='.repeat(70) + '\n';
  resultText += 'END OF REPORT\n';
  resultText += '='.repeat(70) + '\n';
  
  // Save to file
  try {
    writeFileSync(RESULTS_FILE, resultText, 'utf-8');
    console.log('='.repeat(70));
    console.log(`✅ Results saved to ${RESULTS_FILE}`);
    console.log('='.repeat(70));
  } catch (error) {
    console.error(`❌ Error saving results:`, error.message);
  }
  
  // Print summary to console
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Sites: ${results.length}`);
  console.log(`✓ With Passkey: ${withPasskey.length}`);
  console.log(`✗ Without Passkey: ${withoutPasskey.length}`);
  console.log(`Success Rate: ${((withPasskey.length / results.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(70));
  
  console.log(`\n✨ Check ${RESULTS_FILE} for detailed results!\n`);
}

// Run the tests
runTests()
  .then(() => {
    console.log('Test completed! 🎉\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
