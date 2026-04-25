import type OpenAI from "openai";
import { buildTimelineUser, TIMELINE_SYSTEM } from "@/lib/prompts/timelinePrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import { runTavilySearch } from "@/lib/pipeline/tavilySearch";
import type { PipelineLogFn, ProtocolStep, StepTimeline, TimelinePlan, TimelineStepType } from "@/lib/pipeline/types";

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

function parse(raw: Record<string, unknown>, protocol: ProtocolStep[]): TimelinePlan {
  const st = Array.isArray(raw.steps_timeline) ? raw.steps_timeline : [];
  const steps_timeline: StepTimeline[] = st.map((row, i) => {
    const o = row as Record<string, unknown>;
    return {
      step_number: typeof o.step_number === "number" ? o.step_number : i + 1,
      step: String(o.step || protocol[i]?.action || "step").trim(),
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
      : protocol.map((p, j) => ({
          step_number: p.step_number || j + 1,
          step: p.action,
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

function shortQuery(hypothesis: string, protocol: ProtocolStep[]): string {
  const p0 = protocol[0]?.action || "laboratory procedure";
  return `how long does ${p0.slice(0, 80)} take in lab ${hypothesis.slice(0, 40)}`
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateTimeline(
  openai: OpenAI,
  tavilyKey: string,
  hypothesis: string,
  protocol: ProtocolStep[],
  log: PipelineLogFn
): Promise<TimelinePlan> {
  log("timeline_generation", "start", { steps: protocol.length });
  let webNote: string | undefined;
  if (protocol.length > 0) {
    const hits = await runTavilySearch({
      tavilyKey,
      query: shortQuery(hypothesis, protocol),
      maxResults: 2,
    });
    webNote = hits
      .map((h) => `${h.title}: ${(h.content || "").slice(0, 350)}`)
      .join(" | ");
    log("timeline_generation", "tavily", { len: webNote.length });
  }

  const raw = await completeJson(openai, {
    system: TIMELINE_SYSTEM,
    user: buildTimelineUser(hypothesis, protocol, webNote),
    max_tokens: 3000,
  });
  const out = parse(raw, protocol);
  if (webNote) {
    out.web_duration_note = webNote.slice(0, 2000);
  }
  log("timeline_generation", "complete", { phases: out.phases.length });
  return out;
}
