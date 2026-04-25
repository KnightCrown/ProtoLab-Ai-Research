import type { HypothesisAnalysis, MaterialItem, ProtocolStep } from "@/lib/pipeline/types";

const TIMELINE_SCHEMA = `{
  "phases": [ { "name": string, "duration": string, "deliverables": string[] } ],
  "total_duration": string,
  "dependencies": string[]
}`;

export const TIMELINE_SYSTEM = `You produce a realistic project timeline for executing the protocol with the listed materials. ${TIMELINE_SCHEMA}
- phases: 4–8 ordered phases (e.g. pilot, main run, QC, analysis, reporting).
- total_duration: wall-clock span with units (e.g. "8 weeks"). 
- dependencies: critical path items (e.g. "must complete power calc before ordering animals").
- JSON only.`;

export function buildTimelineUserMessage(
  hypothesis: string,
  analysis: HypothesisAnalysis,
  protocol: ProtocolStep[],
  materials: MaterialItem[]
) {
  return `HYPOTHESIS:\n${hypothesis}\n\nANALYSIS:\n${JSON.stringify(
    analysis
  )}\n\nPROTOCOL:\n${JSON.stringify(
    protocol
  )}\n\nMATERIALS:\n${JSON.stringify(materials)}`;
}
