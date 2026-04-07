/**
 * Brand-aware passkey type classifier.
 *
 * Some organizations operate multiple registrable domains that all belong to
 * the same brand (e.g. apple.com + icloud.com, amazon.com + aws.amazon.com).
 * A passkey signal found on any of these should be classified as "native"
 * rather than "third-party".
 *
 * Each entry is a list of registrable domains (eTLD+1) in the same brand.
 */
const BRAND_GROUPS = [
  ['apple.com', 'icloud.com'],
  ['amazon.com', 'aws.com'],
  ['google.com', 'gmail.com', 'youtube.com', 'google.co.kr', 'google.co.jp'],
  ['microsoft.com', 'live.com', 'outlook.com', 'office.com', 'xbox.com', 'microsoftonline.com'],
  ['facebook.com', 'instagram.com', 'meta.com', 'fb.com', 'messenger.com'],
  ['github.com', 'github.io', 'githubusercontent.com'],
  ['twitter.com', 'x.com'],
  ['linkedin.com', 'licdn.com'],
  ['dropbox.com', 'dropboxapi.com'],
  ['slack.com', 'slack-edge.com'],
  ['shopify.com', 'myshopify.com'],
  ['salesforce.com', 'force.com'],
  ['adobe.com', 'adobelogin.com'],
  ['naver.com', 'naver.net'],
  ['kakao.com', 'kakaocdn.net'],
];

function getRegistrableDomain(url) {
  try {
    const parts = new URL(url).hostname.split('.');
    return parts.slice(-2).join('.');
  } catch (_) {
    return null;
  }
}

/**
 * Returns true if both URLs belong to the same brand.
 * Falls back to registrable domain equality if no brand group matches.
 *
 * @param {string} urlA
 * @param {string} urlB
 * @returns {boolean}
 */
export function isSameBrand(urlA, urlB) {
  if (!urlA || !urlB) return true;

  const domainA = getRegistrableDomain(urlA);
  const domainB = getRegistrableDomain(urlB);

  if (!domainA || !domainB) return true;
  if (domainA === domainB) return true;

  for (const group of BRAND_GROUPS) {
    if (group.includes(domainA) && group.includes(domainB)) return true;
  }

  return false;
}

/**
 * Classifies a passkey detection as 'native' or 'third-party' based on
 * whether the signal came from the same brand as the crawl target.
 *
 * @param {string} targetUrl   - the URL being crawled
 * @param {string} signalUrl   - the URL where the passkey signal was found
 * @returns {'native'|'third-party'}
 */
export function classifyPasskeyType(targetUrl, signalUrl) {
  return isSameBrand(targetUrl, signalUrl) ? 'native' : 'third-party';
}
