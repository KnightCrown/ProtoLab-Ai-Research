import type { ProtocolExamplePayload } from "@/lib/pipeline/loadProtocolExample";
import { exampleAsJsonString } from "@/lib/pipeline/loadProtocolExample";
import type { ProtocolRulesPayload } from "@/lib/pipeline/loadProtocolRules";
import { rulesAsJsonString } from "@/lib/pipeline/loadProtocolRules";
import type { HypothesisAnalysis } from "@/lib/pipeline/types";

/**
 * Multi-procedure, flexible lab protocols informed by protocol_rules + protocol_example.
 */

const SCHEMA_HINT = `{
  "protocols": [
    {
      "protocol_id": string,
      "title": string,
      "objective": string,
      "materials": string[],
      "procedure": [ ProcedureStep, ... ],
      "notes_and_calculations"?: string[]
    }
  ],
  "ProcedureStep": {
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
  }
}`;

export function buildProtocolSystemMessage(
  rules: ProtocolRulesPayload,
  example: ProtocolExamplePayload
): string {
  const rulesBlock = rulesAsJsonString(rules);
  const exampleBlock = exampleAsJsonString(example, 14000);
  return `You are an experienced lab scientist writing protocols that read like real SOPs and published methods. Follow scientific correctness and replicability; match the *structure and tone* of the EXAMPLE (not its domain).

## PROTOCOL_RULEBOOK (constraints and must-follow rules; JSON)
${rulesBlock}

## PROTOCOL_EXAMPLE (formatting, tone, level of detail — do not copy the science; emulate the style)
${exampleBlock}

## Output model
- Return JSON with top-level **protocols** (array, length >= 1).
- Each protocol MUST contain in order of intent: **title**, **objective**, **materials**, **procedure** (array of ProcedureStep), and optionally **notes_and_calculations** (string array of notes, formulas, logbook/QA expectations).
- Use **procedure** (not a flat "steps" key). Legacy shape is not accepted.
- **ProcedureStep is flexible:** include only fields that matter for that line. A calculation-heavy line may be mostly \`text\` or \`kind: "calculation"\` with \`text\`. A hands-on step might use \`action\` + \`inputs\` + \`quantities\` + \`conditions\` + \`output\`; a measurement might add \`observation\`. Do **not** fill dummy fields to satisfy a template.
- Use \`sub_steps\` to nest (e.g. 1a/1b, or sub-operations) when it improves clarity.
- Number \`step_number\` in reading order within each protocol; sub_steps carry their own numbers (e.g. 1, 2, 3 for top-level, 1, 1a as text label inside \`text\` or as nested sub_steps with step_number 1 and 2 under parent if your nesting clarifies it — stay consistent and readable in JSON).
- Multiple protocols: one object per distinct procedure/assay/phase of work when the study needs it; otherwise one protocol.
- No vague "standard methods" without the parameters you rely on. No markdown in JSON. ${SCHEMA_HINT}`;
}

export function buildProtocolUserMessage(
  hypothesis: string,
  analysis: HypothesisAnalysis
) {
  return `HYPOTHESIS:\n${hypothesis}

STRUCTURED_PRE_ANALYSIS (JSON):
${JSON.stringify(analysis, null, 2)}

Output only a JSON object with a **protocols** array.`;
}
