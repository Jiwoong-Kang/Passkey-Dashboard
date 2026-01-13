# Web Crawler Implementation Guide

## Overview

The crawler service is located at `backend/services/crawler.js` and is ready for your custom crawling implementation.

## Current Flow

1. User searches for a keyword (e.g., "React")
2. System searches database first
3. If no results found → Shows "No results found. Would you like to search the web?"
4. User clicks "🌐 Search the Web" button
5. Backend calls `crawlWeb(query)` function
6. Crawled results are automatically saved to database
7. Results are displayed to user

## File: `backend/services/crawler.js`

This is where you'll add your crawling code.

### Current Function Signature

```javascript
export const crawlWeb = async (query) => {
  // Your crawling code goes here
  
  // Must return an array of objects with this structure:
  return [
    {
      title: "Link Title",
      url: "https://example.com",
      description: "Description of the link",
      category: "Category Name",
      tags: ["tag1", "tag2"]
    }
  ];
};
```

### Return Format Requirements

Each crawled result must include:
- **title** (required): The title of the link
- **url** (required): The URL
- **description** (optional): Description text
- **category** (optional): Category for organization
- **tags** (optional): Array of tags for better searching

## Implementation Options

### Option 1: Using Puppeteer (Browser Automation)

**Install:**
```bash
cd backend
npm install puppeteer
```

**Example Implementation:**
```javascript
import puppeteer from 'puppeteer';

export const crawlWeb = async (query) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Example: Search Google
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });
  
  // Extract results
  const results = await page.evaluate(() => {
    const items = [];
    const resultElements = document.querySelectorAll('.g');
    
    resultElements.forEach((element, index) => {
      if (index < 10) { // Limit to 10 results
        const titleElement = element.querySelector('h3');
        const linkElement = element.querySelector('a');
        const descElement = element.querySelector('.VwiC3b');
        
        if (titleElement && linkElement) {
          items.push({
            title: titleElement.innerText,
            url: linkElement.href,
            description: descElement ? descElement.innerText : '',
            category: 'Web Result',
            tags: []
          });
        }
      }
    });
    
    return items;
  });
  
  await browser.close();
  return results;
};
```

### Option 2: Using Cheerio + Axios (HTML Parsing)

**Install:**
```bash
cd backend
npm install cheerio axios
```

**Example Implementation:**
```javascript
import axios from 'axios';
import * as cheerio from 'cheerio';

export const crawlWeb = async (query) => {
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    $('.g').each((index, element) => {
      if (index < 10) {
        const title = $(element).find('h3').text();
        const url = $(element).find('a').attr('href');
        const description = $(element).find('.VwiC3b').text();
        
        if (title && url) {
          results.push({
            title,
            url,
            description: description || '',
            category: 'Web Result',
            tags: [query.toLowerCase()]
          });
        }
      }
    });
    
    return results;
  } catch (error) {
    console.error('Crawling error:', error);
    return [];
  }
};
```

### Option 3: Using Search APIs

#### Google Custom Search API

**Setup:**
1. Get API key from Google Cloud Console
2. Create Custom Search Engine
3. Add credentials to `.env`:
```env
GOOGLE_API_KEY=your_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

**Install:**
```bash
npm install googleapis
```

**Example Implementation:**
```javascript
import { google } from 'googleapis';

const customsearch = google.customsearch('v1');

export const crawlWeb = async (query) => {
  try {
    const response = await customsearch.cse.list({
      auth: process.env.GOOGLE_API_KEY,
      cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
      q: query,
      num: 10
    });
    
    const results = response.data.items?.map(item => ({
      title: item.title,
      url: item.link,
      description: item.snippet,
      category: 'Web Result',
      tags: [query.toLowerCase()]
    })) || [];
    
    return results;
  } catch (error) {
    console.error('API error:', error);
    return [];
  }
};
```

#### Bing Search API

**Setup:**
1. Get API key from Azure Portal
2. Add to `.env`:
```env
BING_API_KEY=your_bing_api_key
```

**Example Implementation:**
```javascript
import axios from 'axios';

export const crawlWeb = async (query) => {
  try {
    const response = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
      params: { q: query, count: 10 },
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY
      }
    });
    
    const results = response.data.webPages?.value?.map(item => ({
      title: item.name,
      url: item.url,
      description: item.snippet,
      category: 'Web Result',
      tags: [query.toLowerCase()]
    })) || [];
    
    return results;
  } catch (error) {
    console.error('Bing API error:', error);
    return [];
  }
};
```

## Important Notes

### Rate Limiting
- Add delays between requests to avoid being blocked
- Respect robots.txt
- Use proper User-Agent headers

### Error Handling
- Always wrap crawling in try-catch
- Return empty array on failure
- Log errors for debugging

### Performance
- Set timeouts for requests
- Limit number of results
- Consider caching

### Legal Considerations
- Respect website Terms of Service
- Don't overload servers
- Consider using official APIs when available

## Testing Your Crawler

1. **Update the crawler function** in `backend/services/crawler.js`
2. **Restart backend server**
   ```bash
   cd backend
   npm run dev
   ```
3. **Test in the app:**
   - Search for something not in database
   - Click "Search the Web" button
   - Check if results appear
   - Verify results are saved to database

## Debugging

Add console logs to track progress:
```javascript
export const crawlWeb = async (query) => {
  console.log(`Starting crawl for: ${query}`);
  
  // Your crawling code
  const results = await yourCrawlFunction(query);
  
  console.log(`Found ${results.length} results`);
  return results;
};
```

Check backend terminal for logs when crawling is triggered.

## Current Mock Implementation

The default implementation returns 2 mock results for testing. Replace this with your actual crawling code when ready.

## Need Help?

Common issues:
- **No results appearing**: Check backend console for errors
- **Crawling too slow**: Add timeout or reduce result count
- **Getting blocked**: Use proper headers and delays
- **Database not updating**: Check backend logs for save errors
