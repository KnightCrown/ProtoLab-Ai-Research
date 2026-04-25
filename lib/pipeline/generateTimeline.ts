import type OpenAI from "openai";
import { buildTimelineUser, TIMELINE_SYSTEM } from "@/lib/prompts/timelinePrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import { runTavilySearch } from "@/lib/pipeline/tavilySearch";
import { flattenProtocolSteps } from "@/lib/pipeline/protocolFlatten";
import type {
  FlattenedProcedureLine,
  LaboratoryProtocol,
  StepTimeline,
  TimelinePlan,
  TimelineStepType,
  PipelineLogFn,
} from "@/lib/pipeline/types";

const TYPES: TimelineStepType[] = [
  "preparation",
  "incubation",
  "execution",
  "measurement",
  "analysis",
];

function normType(s: string): TimelineStepType {
  const t = s.toLowerCase() as TimelineStepType;
  return TYPES.includes(t) ? t : "execution";
}

function parse(raw: Record<string, unknown>, flat: FlattenedProcedureLine[]): TimelinePlan {
  const st = Array.isArray(raw.steps_timeline) ? raw.steps_timeline : [];
  const steps_timeline: StepTimeline[] = st.map((row, i) => {
    const o = row as Record<string, unknown>;
    return {
      step_number: typeof o.step_number === "number" ? o.step_number : i + 1,
      step: String(o.step || flat[i]?.summary || "step").trim(),
      estimated_duration: String(o.estimated_duration || "1 h").trim() || "1 h",
      type: normType(String(o.type || "execution")),
    };
  });
  const phasesRaw = Array.isArray(raw.phases) ? raw.phases : [];
  const phases = phasesRaw.map((p) => {
    const o = p as Record<string, unknown>;
    const del = Array.isArray(o.deliverables)
      ? (o.deliverables as unknown[]).map((d) => String(d).trim()).filter(Boolean)
      : [];
    return {
      name: String(o.name || "phase").trim() || "phase",
      duration: String(o.duration || "TBD").trim() || "TBD",
      deliverables: del.length ? del : ["handoff"],
    };
  });
  const dependencies = Array.isArray(raw.dependencies)
    ? (raw.dependencies as unknown[]).map((d) => String(d).trim()).filter(Boolean)
    : [];
  return {
    steps_timeline: steps_timeline.length
      ? steps_timeline
      : flat.map((line, j) => ({
          step_number: line.step_number || j + 1,
          step: line.summary,
          estimated_duration: "TBD",
          type: "execution" as const,
        })),
    phases: phases.length
      ? phases
      : [{ name: "Run protocol", duration: "TBD", deliverables: ["raw + processed data"] }],
    total_duration: String(raw.total_duration || "TBD").trim() || "TBD",
    dependencies: dependencies.length
      ? dependencies
      : ["sequential step completion before final analysis"],
    web_duration_note: typeof raw.web_duration_note === "string" ? raw.web_duration_note : undefined,
  };
}

function shortQuery(hypothesis: string, flat: FlattenedProcedureLine[]): string {
  const p0 = flat[0]?.summary || "laboratory procedure";
  return `how long does ${p0.slice(0, 80)} take in lab ${hypothesis.slice(0, 40)}`
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateTimeline(
  openai: OpenAI,
  tavilyKey: string,
  hypothesis: string,
  protocols: LaboratoryProtocol[],
  log: PipelineLogFn
): Promise<TimelinePlan> {
  const flat = flattenProtocolSteps(protocols);
  log("timeline_generation", "start", { procedures: protocols.length, steps: flat.length });
  let webNote: string | undefined;
  if (flat.length > 0) {
    const hits = await runTavilySearch({
      tavilyKey,
      query: shortQuery(hypothesis, flat),
      maxResults: 2,
    });
    webNote = hits
      .map((h) => `${h.title}: ${(h.content || "").slice(0, 350)}`)
      .join(" | ");
    log("timeline_generation", "tavily", { len: webNote.length });
  }

  const raw = await completeJson(openai, {
    system: TIMELINE_SYSTEM,
    user: buildTimelineUser(hypothesis, protocols, flat, webNote),
    max_tokens: 3000,
  });
  const out = parse(raw, flat);
  if (webNote) {
    out.web_duration_note = webNote.slice(0, 2000);
  }
  log("timeline_generation", "complete", { phases: out.phases.length });
  return out;
}
