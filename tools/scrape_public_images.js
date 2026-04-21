/**
 * Fetches image URLs from a public Pinterest board or image gallery URL.
 * Caps at 100 images. Flags private boards immediately.
 *
 * TODO: Pinterest does not have a public scraping API.
 * Recommended approach: use a headless browser service.
 * Options:
 *   - Browserless.io  (set BROWSERLESS_API_KEY in .env)
 *   - ScrapingBee     (set SCRAPINGBEE_API_KEY in .env)
 *   - Apify Pinterest scraper actor
 *
 * Until a scraping service is configured this returns a clear error
 * so the agent can ask the user to upload screenshots instead.
 */

const BROWSERLESS_KEY = process.env.BROWSERLESS_API_KEY;

/**
 * @param {string} boardUrl - Pinterest board URL or other public gallery
 * @returns {{ images: string[], count: number, skipped: number, isPrivate: boolean }}
 */
export async function scrapePublicImages(boardUrl) {
  if (!BROWSERLESS_KEY) {
    return {
      images:    [],
      count:     0,
      skipped:   0,
      isPrivate: false,
      error:     'no_scraping_service',
      userMessage: "Pinterest board scraping isn't set up yet. Upload screenshots of your Pinterest boards instead and I'll analyze those.",
    };
  }

  // Check for known private board indicators in URL
  if (boardUrl.includes('/secret/')) {
    return { images: [], count: 0, skipped: 0, isPrivate: true, error: 'private_board' };
  }

  try {
    // Browserless.io — runs headless Chrome and returns rendered HTML
    const res = await fetch(`https://chrome.browserless.io/scrape?token=${BROWSERLESS_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: boardUrl,
        elements: [{ selector: 'img[src]' }],
        waitFor: 2000,
      }),
    });

    const data = await res.json();
    const imgElements = data?.data?.[0]?.results ?? [];

    const allUrls = imgElements
      .map(el => el.attributes?.find(a => a.name === 'src')?.value)
      .filter(Boolean)
      .filter(url => url.startsWith('http') && !url.includes('profile') && !url.includes('avatar'));

    const images  = allUrls.slice(0, 100);
    const skipped = Math.max(0, allUrls.length - 100);

    if (images.length < 3) {
      return { images: [], count: 0, skipped: 0, isPrivate: true, error: 'likely_private' };
    }

    return { images, count: images.length, skipped, isPrivate: false };
  } catch (err) {
    return { images: [], count: 0, skipped: 0, isPrivate: false, error: err.message };
  }
}
