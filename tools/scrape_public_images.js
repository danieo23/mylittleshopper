const API_KEY = process.env.SHOPPING_API_KEY;

/**
 * Normalize whatever the user pasted into a clean https://www.pinterest.com/... URL.
 * Accepts: with/without https://, http://, www., or missing protocol entirely.
 */
function normalizePinterestUrl(raw) {
  let url = raw.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  url = url.replace(/^http:\/\//, 'https://');
  return url;
}

function isPinterestUrl(url) {
  try {
    const { hostname } = new URL(url);
    return hostname.endsWith('pinterest.com') || hostname === 'pin.it';
  } catch {
    return false;
  }
}

/**
 * Strategy 1 — Pinterest RSS feed.
 *
 * Public boards expose /rss/ which returns ONLY the board's actual pins.
 * No "More like this", no sidebar recommendations, no profile images.
 * Each <item> in the feed is one pin the user saved.
 */
async function tryRssFeed(boardUrl) {
  const rssUrl = boardUrl.replace(/\/?$/, '/rss/');
  const res = await fetch(rssUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'application/rss+xml, text/xml, */*',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return null;
  const xml = await res.text();
  if (!xml.includes('<item') && !xml.includes('<rss')) return null;

  const images = new Set();

  // <media:content url="..." medium="image" />  — most reliable
  for (const m of xml.matchAll(/media:content[^>]+url="([^"]+)"/gi)) {
    const u = m[1];
    if (u.includes('pinimg.com') && !u.includes('avatar') && !u.includes('profile')) {
      // Prefer 736x (full-size) over thumbnails
      images.add(u.replace(/\/\d+x\//, '/736x/'));
    }
  }

  // <img src="..." /> inside <description> CDATA — fallback
  if (images.size === 0) {
    for (const m of xml.matchAll(/src="(https:\/\/i\.pinimg\.com\/[^"]+)"/gi)) {
      const u = m[1];
      if (!u.includes('avatar') && !u.includes('profile')) {
        images.add(u.replace(/\/\d+x\//, '/736x/'));
      }
    }
  }

  return images.size >= 3 ? [...images] : null;
}

/**
 * Strategy 2 — Direct HTML fetch + embedded JSON.
 *
 * Pinterest inlines board data as JSON in <script> tags.
 * We parse that rather than grepping all img URLs so we only pull pins,
 * not the "More like this" sidebar which is a separate JSON chunk.
 */
async function tryHtmlScrape(boardUrl) {
  const res = await fetch(boardUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return null;
  const html  = await res.text();
  const found = new Set();

  // Extract from board JSON data block first — stops at "related_pins" so we
  // only pull actual board pins, not the "More like this" recommendations.
  const jsonMatch = html.match(/<script[^>]+id="__PWS_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
    ?? html.match(/<script[^>]+type="application\/json"[^>]*>([\s\S]*?)<\/script>/i);

  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[1]);
      const raw = JSON.stringify(obj);
      const boardSection = raw.split('"related_pins"')[0] ?? raw;
      for (const m of boardSection.matchAll(/https:\\\/\\\/i\.pinimg\.com\\\/(?:736x|originals)\\\/[a-f0-9\\/]+\.(?:jpg|jpeg|png|webp)/gi)) {
        const u = m[0].replace(/\\\//g, '/');
        if (!u.includes('avatar') && !u.includes('profile')) found.add(u);
      }
    } catch { /* fall through */ }
  }

  // CDN regex fallback
  if (found.size < 5) {
    for (const m of html.matchAll(/https:\/\/i\.pinimg\.com\/(?:736x|474x|originals)\/[a-f0-9/]+\.(?:jpg|jpeg|png|webp)/gi)) {
      const u = m[0];
      if (!u.includes('avatar') && !u.includes('profile') && !u.includes('favicon')) {
        found.add(u);
      }
    }
  }

  // Only declare private if we found zero images AND see board-specific privacy markers.
  // Do NOT check for generic "private":true — Pinterest puts that in profile metadata
  // on every page, including public boards.
  if (found.size === 0) {
    const lower = html.toLowerCase();
    if (
      lower.includes('"privacy":"secret"') ||
      lower.includes('"board_privacy":"secret"') ||
      lower.includes('"issecret":true') ||
      lower.includes('this board is secret')
    ) {
      return { isPrivate: true };
    }
  }

  return found.size >= 3 ? [...found] : null;
}

/**
 * Strategy 3 — SerpAPI Google Images fallback.
 * Searches for "site:pinterest.com/username/boardname" to find pin images.
 * Least precise but works when other strategies fail.
 */
async function trySerpApi(boardUrl) {
  if (!API_KEY) return null;
  try {
    const searchUrl = new URL('https://serpapi.com/search');
    searchUrl.searchParams.set('engine',  'google_images');
    searchUrl.searchParams.set('q',       `site:${boardUrl}`);
    searchUrl.searchParams.set('api_key', API_KEY);
    searchUrl.searchParams.set('num',     '20');

    const res  = await fetch(searchUrl.toString());
    const data = await res.json();
    const images = (data.images_results ?? [])
      .map(r => r.original || r.thumbnail)
      .filter(Boolean)
      .slice(0, 20);

    return images.length > 0 ? images : null;
  } catch { return null; }
}

/**
 * Main export. Tries strategies in order: RSS → HTML → SerpAPI.
 */
export async function scrapePublicImages(rawUrl) {
  if (!rawUrl) {
    return { images: [], count: 0, error: 'no_url', userMessage: 'No board URL provided.' };
  }

  const boardUrl = normalizePinterestUrl(rawUrl);

  if (!isPinterestUrl(boardUrl)) {
    return {
      images: [], count: 0, error: 'not_pinterest',
      userMessage: 'Only Pinterest board URLs are supported (e.g. https://pinterest.com/yourname/boardname).',
    };
  }

  // Strategy 1: RSS feed — board pins only, no recommendations
  try {
    const rssImages = await tryRssFeed(boardUrl);
    if (rssImages) {
      const sliced = rssImages.slice(0, 30);
      return { images: sliced, count: sliced.length, isPartial: sliced.length < 10, source: 'rss' };
    }
  } catch { /* fall through */ }

  // Strategy 2: HTML scrape with JSON-first extraction
  try {
    const htmlResult = await tryHtmlScrape(boardUrl);
    if (htmlResult?.isPrivate) {
      return {
        images: [], count: 0, isPrivate: true, error: 'private_board',
        userMessage: 'This Pinterest board is private. Make it public or upload screenshots instead.',
      };
    }
    if (Array.isArray(htmlResult) && htmlResult.length >= 3) {
      const sliced = htmlResult.slice(0, 30);
      return { images: sliced, count: sliced.length, isPartial: sliced.length < 10, source: 'html' };
    }
  } catch { /* fall through */ }

  // Strategy 3: SerpAPI fallback
  try {
    const serpImages = await trySerpApi(boardUrl);
    if (serpImages) {
      return { images: serpImages, count: serpImages.length, isPartial: true, source: 'serpapi' };
    }
  } catch { /* fall through */ }

  return {
    images: [], count: 0, error: 'no_images_found',
    userMessage: "Couldn't extract images from this board. Make sure it's public — or upload screenshots of the pins directly.",
  };
}
