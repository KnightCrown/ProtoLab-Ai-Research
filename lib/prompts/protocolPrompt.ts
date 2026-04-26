import type { ProtocolExamplePayload } from "@/lib/pipeline/loadProtocolExample";
import { exampleAsJsonString } from "@/lib/pipeline/loadProtocolExample";
import type { ProtocolRulesPayload } from "@/lib/pipeline/loadProtocolRules";
import { rulesAsJsonString } from "@/lib/pipeline/loadProtocolRules";
import type { HypothesisAnalysis, ProtocolPlanItem } from "@/lib/pipeline/types";

/**
 * Single-protocol generation (one LLM call per planned procedure).
 */

const SINGLE_SCHEMA = `{
  "id": string,
  "title": string,
  "objective": string,
  "materials": string[],
  "procedure": [ ProcedureStep, ... ],
  "notes"?: string[]
}
ProcedureStep: {
  "step_number": number,
  "kind"?: string,
  "text": string (primary narrative for this step; required when step is a leaf),
  "action"?: string,
  "inputs"?: string[],
  "quantities"?: string,
  "conditions"?: { "time"?: string, "temperature"?: string, "concentration"?: string, "other"?: string },
  "output"?: string,
  "observation"?: string,
  "sub_steps"?: [ ProcedureStep, ... ]
}`;

const WRITING_DIRECTIVES = `## Writing directives (highest priority)

**Goal: one publication-grade SOP. Precise, unambiguous, executable steps.**

1. **title** in JSON: must be the same **specific, methods-style** title as the planned protocol (the \`name\` in the user message), or a trivial wording polish only. **Never** a generic one-liner; match the same level of specificity (technique + target + platform as appropriate).

2. **procedure steps — use \`text\` (required per step, unless a step is a pure sub-step group):**  
   Each step’s **\`text\` field** must be the full sentence (or at most two sentences) exactly as in a *Methods* section: include **all** values, **units** (e.g. µL, mg/mL, °C, min), and clear purpose. Examples of tone: *Cut Whatman filter paper into 5 cm × 5 cm square pieces to serve as the substrate for the biosensor.* / *Add 10 µL of anti-CRP antibody solution (1 mg/mL in PBS) to each electrode and incubate at 4 °C for 30 minutes to allow antibody immobilization.*  
   Use \`action\`/\`inputs\`/\`quantities\`/\`conditions\` when helpful for tools, but **\`text\` must be complete** on its own; do not emit fragmentary or telegraphic labels alone.

3. For mechanical work (placement, contact): end with a short quality clause if relevant (*ensuring firm, stable contact with the paper surface*).

4. This JSON documents **one** procedure. Self-contained. **Notes** = formulas/acceptance only.

5. **id** in JSON must match the plan. ${SINGLE_SCHEMA}

**Field priority — the UI uses \`text\` for display; write it as the final protocol prose.**`;

export function buildSingleProtocolSystemMessage(
  rules: ProtocolRulesPayload,
  example: ProtocolExamplePayload
): string {
  const rulesBlock = rulesAsJsonString(rules);
  const exampleBlock = exampleAsJsonString(example, 10000);
  return `You write one lab SOP for **a single** planned procedure. Tight, complete, and runnable.

## PROTOCOL_RULEBOOK
${rulesBlock}

## PROTOCOL_EXAMPLE (style only)
${exampleBlock}

${WRITING_DIRECTIVES}

## Output
Return one JSON object with keys: id, title, objective, materials, procedure, and optionally notes. \`title\` must follow the plan \`name\` specificity. Every procedure line must include a strong **text** field as defined above. No markdown. No extra keys.`;
}

export function buildSingleProtocolUserMessage(
  hypothesis: string,
  analysis: HypothesisAnalysis,
  plan: ProtocolPlanItem,
  appliedFixes: string[] = []
) {
  const fixesBlock = appliedFixes.length
    ? `\nAPPLY THESE CORRECTIONS BASED ON PRIOR FEEDBACK (recurring weaknesses in past runs):\n${appliedFixes
        .map((f) => `- ${f}`)
        .join("\n")}\n`
    : "";

  return `HYPOTHESIS (full study context):
${hypothesis}

STRUCTURED_PRE_ANALYSIS (JSON):
${JSON.stringify(analysis, null, 2)}

THIS PLANNED PROTOCOL (write the full SOP for **only** this one):
- **id (fixed):** ${plan.id}
- **name:** ${plan.name}
- **description:** ${plan.description}
${fixesBlock}
The **id** field in your JSON must equal "${plan.id}".
**title** in JSON should match this planned name (verbatim except minor copy-edits): **${plan.name}**
The SOP is only this procedure; the title is the cover-page name.`;
}
