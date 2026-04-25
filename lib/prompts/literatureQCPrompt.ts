import type { HypothesisAnalysis } from "@/lib/pipeline/types";

const LIT_SCHEMA = `{
  "novelty": "not found" | "similar work exists" | "exact match",
  "reasoning": string
}`;

export const LITERATURE_QC_SYSTEM = `You are a conservative literature triage model. You receive a hypothesis, structured analysis, and 0–3 search snippets.
Classify novelty as exactly one of: "not found", "similar work exists", "exact match" (string values).
- "exact match" only if snippets strongly suggest the same claim already tested.
- "not found" if nothing relevant; "similar work exists" for partial overlap.
Return JSON: ${LIT_SCHEMA} plus the caller will append references; do NOT invent URLs. "reasoning" is 2–4 sentences citing what you saw in the snippets.`;

export function buildLiteratureQCUser(
  hypothesis: string,
  analysis: HypothesisAnalysis,
  snippetsBlock: string
) {
  return `HYPOTHESIS:\n${hypothesis}\n\nSTRUCTURED_ANALYSIS:\n${JSON.stringify(
    analysis
  )}\n\nSNIPPETS FROM SEARCH (may be empty):\n${snippetsBlock || "(no snippets)"}\n\nReturn JSON with novelty and reasoning only.`;
}
