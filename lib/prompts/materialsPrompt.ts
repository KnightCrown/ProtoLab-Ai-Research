import type { HypothesisAnalysis, ProtocolStep } from "@/lib/pipeline/types";

const MATERIALS_SCHEMA = `{
  "materials": [
    { "name": string, "supplier": string, "estimated_cost": string, "quantity": string }
  ]
}`;

export const MATERIALS_SYSTEM = `You list consumables, reagents, and equipment (rental allowed as line items) needed to run the given protocol. ${MATERIALS_SCHEMA}
Costs are rough USD estimates (e.g. "$120" or "$45–$60" as a range in a string). Use real-looking supplier names. Quantities must be specific (e.g. "2 × 96-well plate", "500 mL", "1 kit covers N reactions"). 12–32 items is typical. JSON only.`;

export function buildMaterialsUserMessage(
  hypothesis: string,
  analysis: HypothesisAnalysis,
  protocol: ProtocolStep[]
) {
  return `HYPOTHESIS:\n${hypothesis}\n\nANALYSIS:\n${JSON.stringify(
    analysis
  )}\n\nPROTOCOL (JSON array of steps):\n${JSON.stringify(protocol)}`;
}
