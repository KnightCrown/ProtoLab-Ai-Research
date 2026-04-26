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
  "text"?: string,
  "action"?: string,
  "inputs"?: string[],
  "quantities"?: string,
  "conditions"?: { "time"?: string, "temperature"?: string, "concentration"?: string, "other"?: string },
  "output"?: string,
  "observation"?: string,
  "sub_steps"?: [ ProcedureStep, ... ]
}`;

const WRITING_DIRECTIVES = `## Writing directives (highest priority)

**Goal: precise, unambiguous, executable steps—not long protocols.**

1. This JSON documents **one** procedure only. It must be **self-contained** (a technician can run it without the other protocols, except where you state inputs from prior steps in short cross-refs).
2. **Completeness without padding** — each step pass the technician test; add only missing facts.
3. **Anti-verbosity** — no filler, no repeated context from the hypothesis unless one line is needed to disambiguate.
4. **Numbers and units** where relevant. **Notes** = concise formulas / acceptance / log only.

Use key **procedure** (not "steps"). Optional **notes** array. **id** in JSON must match the planned protocol id given in the user message. ${SINGLE_SCHEMA}`;

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
Return one JSON object with keys: id, title, objective, materials, procedure, and optionally notes. No markdown. No extra keys.`;
}

export function buildSingleProtocolUserMessage(
  hypothesis: string,
  analysis: HypothesisAnalysis,
  plan: ProtocolPlanItem
) {
  return `HYPOTHESIS (full study context):
${hypothesis}

STRUCTURED_PRE_ANALYSIS (JSON):
${JSON.stringify(analysis, null, 2)}

THIS PLANNED PROTOCOL (write the full SOP for **only** this one):
- **id (fixed):** ${plan.id}
- **name:** ${plan.name}
- **description:** ${plan.description}

The **id** field in your JSON must equal "${plan.id}".
**title** may match or refine "${plan.name}" for clarity.`;
}
