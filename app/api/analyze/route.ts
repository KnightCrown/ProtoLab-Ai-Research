import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  type AnalyzeResponseBody,
  type LiteratureReference,
  type NoveltyClassification,
} from "@/lib/analyzeTypes";

export const maxDuration = 60;

const CLASSIFICATIONS: readonly NoveltyClassification[] = [
  "no strong prior work",
  "similar work exists",
  "well studied",
];

type TavilyResult = { title: string; url: string; content: string };

type TavilySearchResponse = { results: TavilyResult[] };

function getEnvOrError(): { openai: string; tavily: string } | { error: string } {
  const openai = process.env.OPENAI_API_KEY?.trim();
  const tavily = process.env.TAVILY_API_KEY?.trim();
  if (!openai || !tavily) {
    return {
      error:
        "Server is missing required API key configuration. Set OPENAI_API_KEY and TAVILY_API_KEY in .env.local.",
    };
  }
  return { openai, tavily };
}

function normalizeClassification(raw: string | undefined): NoveltyClassification {
  const t = (raw || "").toLowerCase().replace(/\s+/g, " ").trim();
  for (const c of CLASSIFICATIONS) {
    if (t === c) return c;
  }
  if (t.includes("no strong") || t.includes("little prior") || t.includes("limited prior")) {
    return "no strong prior work";
  }
  if (t.includes("well studied") || t.includes("mature") || t.includes("extensive prior")) {
    return "well studied";
  }
  return "similar work exists";
}

function clampReferences(refs: LiteratureReference[], max = 2): LiteratureReference[] {
  return refs.filter((r) => r.url?.trim() && r.title?.trim()).slice(0, max);
}

function safeJsonParseObject(text: string, label: string): Record<string, unknown> {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\n?/m, "").replace(/```\s*$/m, "").trim();
  }
  if (!t) {
    throw new Error(`${label}: empty model output`);
  }
  try {
    return JSON.parse(t) as Record<string, unknown>;
  } catch {
    throw new Error(`${label}: invalid JSON`);
  }
}

export async function POST(request: Request) {
  const env = getEnvOrError();
  if ("error" in env) {
    return NextResponse.json({ error: env.error }, { status: 500 });
  }

  let body: { hypothesis?: unknown };
  try {
    body = (await request.json()) as { hypothesis?: unknown };
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const hypothesis = typeof body.hypothesis === "string" ? body.hypothesis.trim() : "";
  if (!hypothesis) {
    return NextResponse.json({ error: 'Field "hypothesis" is required' }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: env.openai });

  try {
    const qRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 80,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Convert the user hypothesis into a focused scientific web search query. Output 6–12 keywords only: organisms, model systems, key molecules/phenomena, and core outcome. No full sentences, no surrounding quotes, no newlines, no emojis.",
        },
        { role: "user", content: hypothesis },
      ],
    });

    const searchQuery = (qRes.choices[0]?.message?.content || hypothesis)
      .replace(/\n/g, " ")
      .trim() || hypothesis;

    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.tavily,
        query: searchQuery,
        max_results: 3,
        search_depth: "basic",
        include_answer: false,
      }),
    });

    if (!tavilyRes.ok) {
      return NextResponse.json(
        { error: `Literature search failed (${tavilyRes.status}).` },
        { status: 502 }
      );
    }

    const tavilyJson = (await tavilyRes.json()) as TavilySearchResponse;
    const topHits = tavilyJson.results || [];
    const results = topHits.map((r) => ({
      title: r.title || "Untitled",
      url: r.url || "#",
      snippet: (r.content || "").slice(0, 500),
    }));

    const tavilyBlock = results
      .map(
        (r, i) =>
          `(${i + 1}) title: ${r.title}\nurl: ${r.url}\nsnippet: ${r.snippet}`
      )
      .join("\n\n");

    const lit = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 500,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a research assistant. You receive a hypothesis and 0–3 web search hits (snippets).
Return a JSON object with this exact shape:
{ "classification": "no strong prior work" | "similar work exists" | "well studied", "reasoning": "2–4 sentences, grounded in the snippets; say what is uncertain if snippets are limited", "references": [ { "title": "...", "url": "https://..." } ] }
The references must be 0–2 items, chosen from the provided hits when possible. Use exact URLs. If there are 0 search hits, set "references" to []. Be conservative: prefer "similar work exists" when the evidence is mixed.
`,
        },
        {
          role: "user",
          content: `HYPOTHESIS\n${hypothesis}\n\nSEARCH HITS (may be empty)\n${
            tavilyBlock || "(no hits)"
          }\n`,
        },
      ],
    });

    const litText = lit.choices[0]?.message?.content || "";
    const rawNov = safeJsonParseObject(litText, "novelty");
    if (typeof rawNov.reasoning !== "string" || !rawNov.reasoning.trim()) {
      throw new Error("Model returned invalid novelty reasoning");
    }
    if (!Array.isArray(rawNov.references)) {
      throw new Error("Model returned invalid references array");
    }

    const classification = normalizeClassification(
      typeof rawNov.classification === "string" ? rawNov.classification : ""
    );
    const reasoning = rawNov.reasoning.trim();
    const modelRefs: LiteratureReference[] = (rawNov.references as { title: string; url: string }[])
      .map((r) => ({ title: (r.title || "").trim(), url: (r.url || "").trim() }));
    const references = clampReferences(
      modelRefs.length > 0
        ? modelRefs
        : results.map((r) => ({
            title: r.title,
            url: r.url,
          })),
      2
    );

    const tavilySnippetsForProtocol = topHits
      .slice(0, 2)
      .map((h, i) => `(${i + 1}) ${(h.content || "").slice(0, 300)} — ${h.url}`)
      .join("\n");

    const prot = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 800,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You write a concise, executable lab protocol. Return JSON only, shape:
{ "protocol": [ "string step1", "string step2", ... ] }
Use 6–10 steps. Be specific: include temperatures, durations, and measurable quantities (volumes, concentrations, n, replicates) where reasonable. If unknown, use explicit placeholders (e.g., "5–10% CO2" or "0.1–1 mM" ranges). Avoid generic steps like "analyze data" without a concrete method. Ground methods in the hypothesis. Do not include keys other than "protocol" and the step strings.`, 
        },
        {
          role: "user",
          content: `HYPOTHESIS\n${hypothesis}\n\n(optional) CONTEXT SNIPPETS (may be empty)\n${
            tavilySnippetsForProtocol || "(no snippets)"
          }`,
        },
      ],
    });

    const pText = prot.choices[0]?.message?.content || "";
    const pObj = safeJsonParseObject(pText, "protocol");
    if (!Array.isArray(pObj.protocol) || pObj.protocol.length === 0) {
      throw new Error("Model returned invalid protocol array");
    }
    const protocol = pObj.protocol
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .map((s) => (s as string).trim());
    if (protocol.length < 3) {
      throw new Error("Model returned too few protocol steps");
    }

    const out: AnalyzeResponseBody = {
      novelty: { classification, reasoning, references },
      protocol,
    };

    return NextResponse.json(out);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred while analyzing the hypothesis";
    return NextResponse.json(
      { error: `Analysis failed. ${message}` },
      { status: 500 }
    );
  }
}
