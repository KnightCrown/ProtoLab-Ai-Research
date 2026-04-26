import type { HypothesisAnalysis } from "@/lib/pipeline/types";

const PLAN_SCHEMA = `{
  "protocol_plan": [
    { "id": string, "name": string, "description": string }
  ]
}`;

export const PLAN_PROTOCOLS_SYSTEM = `You are an experimental design lead. Decompose a study into **all distinct lab protocols (SOPs)** needed to run it end to end: fabrication, sample prep, calibration, treatment, time courses, controls, validation, measurement, data capture, analysis runs if they are separable procedures, etc.

## Rules
- Output **protocol_plan** as a **JSON array** (see schema). **Minimum 2** entries for any non-trivial study; a single all-in-one procedure is only acceptable for the simplest one-assay case.
- **Count:** Prefer **3–5** distinct protocols for most studies. **Do not exceed 6** rows—merge related micro-steps into one protocol if you would otherwise list more. Split only on real workflow boundaries (independent SOPs), not on every sub-task.
- Each item: **id** (stable kebab or slug, unique), **name** (short), **description** (1–3 sentences: scope, what this protocol delivers, how it fits the workflow).
- **Order** items in the same order the lab would run them (dependencies / logical flow). Later protocols may depend on earlier outputs; note that in descriptions where relevant.
- Cover the **full experiment lifecycle** implied by the hypothesis and design: do not merge unrelated phases into one plan row — split into **separate** protocols.
- **Do not** write procedure steps here — only the plan. No markdown. ${PLAN_SCHEMA}
- Return JSON with exactly one top-level key: **protocol_plan**.`;

export function buildPlanProtocolsUserMessage(
  hypothesis: string,
  analysis: HypothesisAnalysis
) {
  return `HYPOTHESIS:\n${hypothesis}

EXPERIMENT DESIGN (from prior analysis, JSON):
${JSON.stringify(analysis, null, 2)}

List every protocol required. JSON only.`;
}
