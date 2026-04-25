type TavilyHit = { title: string; url: string; content: string };

type TavilyResponse = { results: TavilyHit[] };

export async function runTavilySearch(args: {
  tavilyKey: string;
  query: string;
  maxResults?: number;
}): Promise<TavilyHit[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: args.tavilyKey,
      query: args.query,
      max_results: args.maxResults ?? 3,
      search_depth: "basic",
      include_answer: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`Tavily search failed: HTTP ${res.status}`);
  }
  const j = (await res.json()) as TavilyResponse;
  return j.results || [];
}
