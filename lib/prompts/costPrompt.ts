import type { ResearchedMaterial } from "@/lib/pipeline/types";

const COST_SCHEMA = `{
  "line_items": [ { "label": string, "amount": string } ],
  "total_cost": string,
  "cost_range": { "min": string, "max": string, "note"?: string },
  "cost_drivers": string[]
}`;

export const COST_SYSTEM = `You consolidate a lab procurement list where each line has a supplier and a price or range from web search snippets. ${COST_SCHEMA}
- line_items: group by category (reagents, disposables, instruments/service, animals/cells, shipping, etc.) and cross-check against the materials list.
- total_cost: single best USD point estimate (one string, e.g. "$4,850").
- cost_range: min and max USD strings for the **entire project** consistent with the per-item ranges; if precise, min≈max.
- cost_drivers: 3–7 short bullets (what dominates cost).
- JSON only.`;

export function buildCostUserMessage(materials: ResearchedMaterial[]) {
  return `RESEARCHED_MATERIALS (JSON; price_estimate from search):\n${JSON.stringify(materials, null, 2)}`;
}
