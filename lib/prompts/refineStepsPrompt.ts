import type { HypothesisAnalysis, LaboratoryProtocol, ProcedureStep, ProtocolPlanItem } from "@/lib/pipeline/types";

export const REFINE_STEPS_SYSTEM = `You are a laboratory SOP editor. Rewrite raw procedure steps into precise, executable laboratory instructions.

## Transformation rules

1. START with a strong action verb (Cut, Add, Pipette, Incubate, Rinse, Centrifuge, …).
2. SPECIFICITY — if a value is missing or vague, supply a realistic standard laboratory value consistent with the technique:
   • Volumes:        e.g. 10 µL, 200 µL, 1 mL
   • Concentrations: parenthetical form — e.g. (1 mg/mL in PBS)
   • Time:           e.g. 30 minutes, 1 hour
   • Temperature:    e.g. 4 °C, room temperature (~22 °C), 37 °C
   • Dimensions:     use × — e.g. 5 cm × 5 cm
   Do NOT invent implausible values; infer from the protocol type and hypothesis context.
3. FULL SENTENCES — one or two complete Methods-section sentences per step. Never fragments.
   ✗  "Add antibodies solution at 4 °C for 30 min"
   ✓  "Add 10 µL of anti-CRP antibody solution (1 mg/mL in PBS) to each electrode and incubate at 4 °C for 30 minutes to allow antibody immobilization."
4. TOOL / METHOD — name the instrument or technique when non-obvious (pipette, vortex, centrifuge, rinse with…).
5. QUALITY CLAUSE — end mechanical placement steps with a brief correctness note when relevant:
   e.g. "…ensuring firm, stable contact with the paper surface."
6. CONCISE — do not pad with background or repeat the objective. One step = one discrete operation.
7. UNITS — always explicit: µL, mL, mg/mL, °C, min, rpm, ×.
8. ACTIONABILITY test: can a bench technician execute this step immediately without asking a follow-up question? If not, fix it.
9. PURPOSE CLAUSE — for incubation/binding/coating steps add a short "to allow …" or "to ensure …" tail:
   e.g. "…to allow complete surface passivation."
10. PRESERVE step_number values exactly — output one entry per input step, in the same order.

## Output
Return only JSON: { "refined_steps": [ { "step_number": number, "text": string }, ... ] }`;

/** Compact serialisation of a raw step for the model to work from. */
function serializeRawStep(s: ProcedureStep): string {
  const parts: string[] = [];
  if (s.text?.trim()) parts.push(`text: ${s.text.trim()}`);
  if (s.action?.trim()) parts.push(`action: ${s.action.trim()}`);
  if (s.inputs?.length) parts.push(`inputs: ${s.inputs.join(", ")}`);
  if (s.quantities?.trim()) parts.push(`quantities: ${s.quantities.trim()}`);
  if (s.conditions) {
    const c = s.conditions;
    const cParts = [
      c.time ? `time=${c.time}` : "",
      c.temperature ? `temp=${c.temperature}` : "",
      c.concentration ? `conc=${c.concentration}` : "",
      c.other ? `other=${c.other}` : "",
    ].filter(Boolean);
    if (cParts.length) parts.push(`conditions: ${cParts.join(", ")}`);
  }
  if (s.output?.trim()) parts.push(`output: ${s.output.trim()}`);
  if (s.observation?.trim()) parts.push(`observation: ${s.observation.trim()}`);
  return parts.join(" | ");
}

export function buildRefineStepsUser(
  protocol: LaboratoryProtocol,
  hypothesis: string,
  analysis: HypothesisAnalysis,
  plan: ProtocolPlanItem
): string {
  const stepsBlock = protocol.procedure
    .map((s) => `Step ${s.step_number}: ${serializeRawStep(s) || "(no content)"}`)
    .join("\n");

  return `PROTOCOL TITLE: ${protocol.title}
OBJECTIVE: ${protocol.objective}
PLAN DESCRIPTION: ${plan.description}

HYPOTHESIS CONTEXT: ${hypothesis}
MEASUREMENT METHOD: ${analysis.measurement_method}
INDEPENDENT VARIABLES: ${analysis.independent_variables.join(", ")}
DEPENDENT VARIABLES: ${analysis.dependent_variables.join(", ")}

RAW STEPS TO REFINE (${protocol.procedure.length} steps):
${stepsBlock}

Rewrite each step into a precise, executable Methods-section instruction. Return JSON with "refined_steps" array (one object per step, preserving step_number).`;
}
