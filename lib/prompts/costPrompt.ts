import type { ResearchedMaterial } from "@/lib/pipeline/types";

const COST_SCHEMA = `{
  "line_items": [ { "label": string, "amount": string } ],
  "total_cost": string,
  "cost_range": { "min": string, "max": string, "note"?: string },
  "cost_drivers": string[]
}`;

export const COST_SYSTEM = `You build a procurement cost summary from a list of researched laboratory materials. ${COST_SCHEMA}

## Rules

### line_items
- Create one line per material category, not per individual item:
  group into Reagents & antibodies, Consumable labware, Specialised equipment, Other.
- Base amounts ONLY on the price_estimate values already provided in the materials list.
  Do NOT add line items for equipment not present in the materials list.
  Do NOT include standard laboratory equipment (pipettes, centrifuges, incubators,
  balances, vortex, pH meter, autoclave, PPE, etc.) — these are assumed available.
- If a material has no price ("Not found in search results"), omit it from totals
  or note it as "price not found" in the line label.

### total_cost
- Single best USD point estimate summed from available prices only.
- If fewer than half the materials have prices, prefix with "~" to signal partial data.

### cost_range
- Realistic min / max for the whole project based on the provided price ranges.
- If data is sparse, widen the range and add a note.

### cost_drivers
- 3–7 concise bullets naming the items that dominate cost (reagents, specialised
  instrument rental/purchase, etc.).

### General
- JSON only; no commentary outside the JSON object.`;

export function buildCostUserMessage(materials: ResearchedMaterial[]): string {
  return `RESEARCHED_MATERIALS (JSON; price_estimate from web search):\n${JSON.stringify(materials, null, 2)}`;
}
