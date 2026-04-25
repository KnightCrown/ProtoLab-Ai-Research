import type { ProtocolStep } from "@/lib/pipeline/types";

const TIMELINE_SCHEMA = `{
  "steps_timeline": [
    { "step_number": number, "step": string, "estimated_duration": string, "type": "preparation" | "incubation" | "execution" | "measurement" | "analysis" }
  ],
  "phases": [ { "name": string, "duration": string, "deliverables": string[] } ],
  "total_duration": string,
  "dependencies": string[]
}`;

export const TIMELINE_SYSTEM = `You are a lab operations scheduler. Build a realistic wall-clock timeline from structured protocol steps only. ${TIMELINE_SCHEMA}

Rules:
- Classify each protocol step into exactly one type: preparation | incubation | execution | measurement | analysis.
- estimated_duration must be concrete (e.g. "45 min", "16 h", "3 days") and reflect the conditions in the step when present.
- preparation: setup, aliquoting, calibration, labeling, thawing.
- incubation: timed culture/assay waits, blocking, hybridization overnight, etc.
- execution: hands-on treatment, sampling, transfer, loading, transfection window.
- measurement: instrument runs, imaging sessions, reads, FC acquisition.
- analysis: QC, stats, figure prep, not raw acquisition.
- phases: 3–6 phases that group steps; each phase has duration and deliverables.
- total_duration: end-to-end calendar span with units.
- dependencies: 3–8 critical path strings (not generic).
- If OPTIONAL_WEB_NOTE is present in the user message, use it as a weak prior for long incubation/human or animal work timing—do not contradict the protocol.
- JSON only.`;

export function buildTimelineUser(
  hypothesis: string,
  protocol: ProtocolStep[],
  webNote?: string
) {
  return `HYPOTHESIS (context):\n${hypothesis}\n\nSTRUCTURED_PROTOCOL:\n${JSON.stringify(
    protocol,
    null,
    2
  )}\n\nOPTIONAL_WEB_NOTE:\n${webNote || "(none)"}`;
}
