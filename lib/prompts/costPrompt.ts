import type { MaterialItem } from "@/lib/pipeline/types";

const COST_SCHEMA: string = `{
  "line_items": [ { "label": string, "amount": string } ],
  "total_cost": string,
  "cost_drivers": string[]
}`;

export const COST_SYSTEM = `You are a budget analyst for research labs. Given materials with estimated costs, build a transparent cost breakdown. ${COST_SCHEMA}
- line_items: include major categories (reagents, animals/cells, equipment time, service cores, etc.) and map to the materials where possible.
- total_cost: single USD string (e.g. "$4,200" or "$3.2k" — prefer one clear total).
- cost_drivers: 3–6 short bullets of what moved cost most.
- JSON only.`;

export function buildCostUserMessage(
  materials: MaterialItem[]
): { system: string; user: string } {
  return {
    system: COST_SYSTEM,
    user: `MATERIALS (JSON array):\n${JSON.stringify(materials, null, 2)}`,
  };
}
