/**
 * Converts a user search query into a list of candidate URLs to crawl.
 * @param {string} query - Raw user input (domain name, partial URL, or full URL)
 * @returns {Promise<Array<{title: string, url: string}>>}
 */
export async function searchForSites(query) {
  const results = [];
  const cleanQuery = query.trim().toLowerCase();

  if (cleanQuery.startsWith('http://') || cleanQuery.startsWith('https://')) {
    try {
      const url = new URL(cleanQuery);
      results.push({ title: url.hostname, url: cleanQuery });
      return results;
    } catch (_) {
      // Invalid URL — fall through to domain handling
    }
  }

  let domain = cleanQuery
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9.-]/g, '');

  domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');

  const title = query
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  const hasTLD = /\.[a-z]{2,}$/i.test(domain);
  const url = hasTLD ? `https://www.${domain}` : `https://www.${domain}.com`;

  results.push({ title, url });

  console.log(`[Crawler] Generated URL for query "${query}": ${url}`);
  return results;
}
