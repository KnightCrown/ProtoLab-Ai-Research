import type { HypothesisAnalysis, LaboratoryProtocol } from "@/lib/pipeline/types";

const VAL_SCHEMA = `{
  "measurement_method": string,
  "statistical_test": string,
  "success_criteria": string,
  "sources_of_error": string[]
}`;

export const VALIDATION_SYSTEM = `You define validation and statistics for the experiment that match the hypothesis and protocol. ${VAL_SCHEMA}
- statistical_test: name the primary test, reference design (paired/unpaired, blocking, multiple testing control) in one sentence.
- sources_of_error: 5–10 specific bullet-style strings (not generic "human error" — name mechanisms).
- JSON only.`;

export function buildValidationUserMessage(
  hypothesis: string,
  analysis: HypothesisAnalysis,
  protocols: LaboratoryProtocol[]
) {
  return `HYPOTHESIS:\n${hypothesis}\n\nANALYSIS:\n${JSON.stringify(
    analysis
  )}\n\nLABORATORY_PROTOCOLS (may be multiple procedures):\n${JSON.stringify(protocols)}`;
}
