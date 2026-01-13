// Test script for crawler functionality
// Usage: node test-crawler.js [search-query]

import { crawlWeb } from './services/crawler.js';

// Get search query from command line argument, default to "github"
const query = process.argv[2] || 'github';

console.log('='.repeat(60));
console.log('🔍 Testing Passkey Crawler');
console.log('='.repeat(60));
console.log(`Query: "${query}"`);
console.log('Starting crawl...\n');

// Run the crawler
crawlWeb(query)
  .then(results => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Crawling Complete!');
    console.log('='.repeat(60));
    console.log(`\nFound ${results.length} passkey-enabled site(s):\n`);
    
    if (results.length === 0) {
      console.log('No passkey-enabled sites found.');
    } else {
      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Description: ${result.description}`);
        console.log(`   Category: ${result.category}`);
        console.log(`   Tags: ${result.tags.join(', ')}`);
        console.log('');
      });
    }
    
    console.log('='.repeat(60));
    console.log('Test completed successfully! 🎉');
    console.log('='.repeat(60));
    process.exit(0);
  })
  .catch(error => {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Error during crawling:');
    console.error('='.repeat(60));
    console.error(error);
    console.error('\n' + '='.repeat(60));
    process.exit(1);
  });
