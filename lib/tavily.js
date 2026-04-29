const BASE = 'https://api.tavily.com/search';

export async function tavilySearch(query, { maxResults = 10, includeImages = true } = {}) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error('TAVILY_API_KEY not set');

  const res = await fetch(BASE, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ api_key: key, query, max_results: maxResults, include_images: includeImages }),
    signal:  AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? `Tavily HTTP ${res.status}`);
  return data; // { results[], images[], answer? }
}
