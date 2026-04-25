import type { FlattenedProcedureLine, LaboratoryProtocol } from "@/lib/pipeline/types";

const TIMELINE_SCHEMA = `{
  "steps_timeline": [
    { "step_number": number, "step": string, "estimated_duration": string, "type": "preparation" | "incubation" | "execution" | "measurement" | "analysis" }
  ],
  "phases": [ { "name": string, "duration": string, "deliverables": string[] } ],
  "total_duration": string,
  "dependencies": string[]
}`;

export const TIMELINE_SYSTEM = `You are a lab operations scheduler. Build a realistic wall-clock timeline from the structured protocol(s) only. ${TIMELINE_SCHEMA}

The user supplies FLATTENED_STEPS: one entry per *leaf* procedure line (depth-first), with a natural-language summary. Align \`step_number\` in steps_timeline to 1..N in that list.

You may also see full PROCEDURES JSON for context (nested sub_steps may exist).

Rules:
- Classify each flattened step into exactly one type: preparation | incubation | execution | measurement | analysis.
- estimated_duration must be concrete and reflect the step when conditions are implied in the text.
- preparation: setup, aliquoting, calibration, weighing, buffer prep, labeling, thawing.
- incubation: timed waits, culture, blocking, hybridization.
- execution: hands-on treatment, transfer, titration, loading, transfection, sampling.
- measurement: instrument runs, reads, imaging, pH, counts.
- analysis: data reduction, stats, figure prep, notebook sign-off, not raw acquisition.
- phases: 3–6 logical phases; can span several procedures; include duration and deliverables.
- total_duration: end-to-end span with units.
- dependencies: 3–8 critical path strings.
- If OPTIONAL_WEB_NOTE is present, use it as a weak prior—do not contradict the protocol.
- JSON only.`;

export function buildTimelineUser(
  hypothesis: string,
  procedures: LaboratoryProtocol[],
  flatSteps: FlattenedProcedureLine[],
  webNote?: string
) {
  return `HYPOTHESIS (context):\n${hypothesis}\n\nPROCEDURES (JSON):\n${JSON.stringify(
    procedures,
    null,
    2
  )}\n\nFLATTENED_STEPS (use these indices for steps_timeline):\n${JSON.stringify(
    flatSteps,
    null,
    2
  )}\n\nOPTIONAL_WEB_NOTE:\n${webNote || "(none)"}`;
}
