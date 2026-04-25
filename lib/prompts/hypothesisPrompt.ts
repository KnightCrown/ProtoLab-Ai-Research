/**
 * Stage: hypothesis_analysis — own prompt, no shared mega-prompt.
 */

export const HYPOTHESIS_SYSTEM = `You are a methodical experimentalist. Decompose a scientific hypothesis into a structured design sketch.
You MUST return JSON only, matching the schema in the user message. Use concise strings. Arrays may be empty only if truly impossible to infer, but prefer at least 1 string per list when the hypothesis allows.
control_group: object with keys you define (e.g. treatment, cell_line, media) as strings, or { "description": "..." }.
experimental_groups: short labels of distinct arms.
measurement_method: primary readout, concrete (assay/endpoint, not "measure outcome").
success_criteria: quantitative or categorical pass/fail when possible.`;

export function buildHypothesisUserMessage(hypothesis: string, schema: string) {
  return `HYPOTHESIS:\n${hypothesis}\n\nReturn a JSON object with exactly these keys: ${schema}`;
}

export const HYPOTHESIS_JSON_KEYS = `{
  "independent_variables": string[],
  "dependent_variables": string[],
  "control_group": object,
  "experimental_groups": string[],
  "measurement_method": string,
  "success_criteria": string
}`;
