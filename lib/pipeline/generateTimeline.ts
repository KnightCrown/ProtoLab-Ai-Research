import type OpenAI from "openai";
import { buildTimelineUserMessage, TIMELINE_SYSTEM } from "@/lib/prompts/timelinePrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import type {
  HypothesisAnalysis,
  MaterialItem,
  PipelineLogFn,
  ProtocolStep,
  TimelinePlan,
} from "@/lib/pipeline/types";

function parse(raw: Record<string, unknown>): TimelinePlan {
  const phasesRaw = Array.isArray(raw.phases) ? raw.phases : [];
  const phases = phasesRaw.map((p) => {
    const o = p as Record<string, unknown>;
    const del = Array.isArray(o.deliverables)
      ? (o.deliverables as unknown[]).map((d) => String(d).trim()).filter(Boolean)
      : [];
    return {
      name: String(o.name || "phase").trim() || "phase",
      duration: String(o.duration || "TBD").trim() || "TBD",
      deliverables: del.length ? del : ["milestone report"],
    };
  });
  const dependencies = Array.isArray(raw.dependencies)
    ? (raw.dependencies as unknown[]).map((d) => String(d).trim()).filter(Boolean)
    : [];
  return {
    phases: phases.length
      ? phases
      : [{ name: "Execution", duration: "TBD", deliverables: ["data package"] }],
    total_duration: String(raw.total_duration || "TBD").trim() || "TBD",
    dependencies: dependencies.length ? dependencies : ["sequence per protocol SOPs"],
  };
}

export async function generateTimeline(
  openai: OpenAI,
  hypothesis: string,
  analysis: HypothesisAnalysis,
  protocol: ProtocolStep[],
  materials: MaterialItem[],
  log: PipelineLogFn
): Promise<TimelinePlan> {
  log("timeline_generation", "start", {});
  const raw = await completeJson(openai, {
    system: TIMELINE_SYSTEM,
    user: buildTimelineUserMessage(hypothesis, analysis, protocol, materials),
    max_tokens: 1400,
  });
  const out = parse(raw);
  log("timeline_generation", "complete", { phases: out.phases.length });
  return out;
}
