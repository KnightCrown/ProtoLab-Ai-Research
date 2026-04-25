import type { ProtocolRulesPayload } from "@/lib/pipeline/loadProtocolRules";
import { rulesAsJsonString } from "@/lib/pipeline/loadProtocolRules";
import type { HypothesisAnalysis } from "@/lib/pipeline/types";

/**
 * Protocol generation: MUST include protocol rulebook. No vague steps.
 */

const PROTOCOL_SCHEMA = `{
  "steps": [
    {
      "step_number": number,
      "action": string,
      "inputs": string[],
      "conditions": { "time"?: string, "temperature"?: string, "concentration"?: string, "other"?: string },
      "output": string
    }
  ]
}`;

export function buildProtocolSystemMessage(rules: ProtocolRulesPayload): string {
  const rulesBlock = rulesAsJsonString(rules);
  return `You are a senior wet-lab protocol writer. You MUST obey the PROTOCOL_RULEBOOK and produce executable, lab-ready steps.

## PROTOCOL_RULEBOOK (JSON; includes constraints and the authoritative rule text — follow it strictly)
${rulesBlock}

## Hard requirements
- Every step MUST have non-empty: action, inputs (at least 1), conditions (at least 1 of time/temperature/concentration/other filled for wet-lab steps), and output.
- Forbid vague steps: no "standard procedure", "optimize as needed", "perform analysis" without instruments and parameters.
- If a parameter is not known, put a defensible default RANGE in conditions.other (e.g. "suggested: 0.1–1 mM; verify by pilot").
- Return JSON only with this shape: ${PROTOCOL_SCHEMA}
- 8–14 steps for a typical in vitro / animal / clinical pilot unless the hypothesis is trivial (then 6+).
- Step numbers are 1..N in order.`;
}

export function buildProtocolUserMessage(
  hypothesis: string,
  analysis: HypothesisAnalysis
) {
  return `HYPOTHESIS:\n${hypothesis}

STRUCTURED_PRE_ANALYSIS (JSON):
${JSON.stringify(analysis, null, 2)}

Generate the protocol "steps" array only. No markdown. No commentary outside JSON.`;
}
