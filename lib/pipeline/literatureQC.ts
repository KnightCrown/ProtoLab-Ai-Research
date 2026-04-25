import type OpenAI from "openai";
import { buildLiteratureQCUser, LITERATURE_QC_SYSTEM } from "@/lib/prompts/literatureQCPrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import { runTavilySearch } from "@/lib/pipeline/tavilySearch";
import type { HypothesisAnalysis, LiteratureNovelty, LiteratureQC, PipelineLogFn } from "@/lib/pipeline/types";

function buildSearchQuery(hypothesis: string, a: HypothesisAnalysis): string {
  const parts = [
    ...a.independent_variables,
    ...a.dependent_variables,
    a.measurement_method,
  ]
    .filter(Boolean)
    .join(" ");
  return `${hypothesis} ${parts}`.replace(/\s+/g, " ").trim().slice(0, 400);
}

function normalizeNovelty(s: string): LiteratureNovelty {
  const t = s.toLowerCase().replace(/_/g, " ").trim();
  if (t.includes("exact")) return "exact match";
  if (t.includes("not found") || t === "notfound") return "not found";
  return "similar work exists";
}

export async function literatureQC(
  openai: OpenAI,
  tavilyKey: string,
  hypothesis: string,
  analysis: HypothesisAnalysis,
  log: PipelineLogFn
): Promise<LiteratureQC> {
  log("literature_qc", "start", {});
  const qRes = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 100,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "Convert the next hypothesis + variables into 6–12 keyword web search terms for scientific papers. No sentences; keywords only; no quotes.",
      },
      {
        role: "user",
        content: `HYPOTHESIS: ${hypothesis}\nFIELDS: ${buildSearchQuery(hypothesis, analysis)}`,
      },
    ],
  });
  const query = (qRes.choices[0]?.message?.content || buildSearchQuery(hypothesis, analysis))
    .replace(/\n/g, " ")
    .trim();
  const hits = await runTavilySearch({ tavilyKey, query, maxResults: 3 });
  const references = hits.map((h) => ({
    title: h.title || "Untitled",
    url: h.url || "#",
    snippet: (h.content || "").slice(0, 400),
  }));
  const snippetsBlock = references
    .map((r, i) => `(${i + 1}) ${r.title}\n${r.snippet || ""}\n${r.url}`)
    .join("\n\n");
  const raw = await completeJson(openai, {
    system: LITERATURE_QC_SYSTEM,
    user: buildLiteratureQCUser(hypothesis, analysis, snippetsBlock),
    max_tokens: 500,
  });
  const n = String(raw.novelty || "similar work exists");
  const out: LiteratureQC = {
    novelty: normalizeNovelty(n),
    references,
    reasoning: typeof raw.reasoning === "string" ? raw.reasoning.trim() : undefined,
  };
  log("literature_qc", "complete", { novelty: out.novelty, refs: out.references.length });
  return out;
}
