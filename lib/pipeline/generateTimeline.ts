import type OpenAI from "openai";
import {
  buildTimelineMergeUser,
  buildTimelineQueryUser,
  TIMELINE_MERGE_SYSTEM,
  TIMELINE_QUERY_SYSTEM,
} from "@/lib/prompts/timelinePrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import { runTavilySearch } from "@/lib/pipeline/tavilySearch";
import { flattenProtocolSteps } from "@/lib/pipeline/protocolFlatten";
import type {
  FlattenedProcedureLine,
  LaboratoryProtocol,
  ProtocolDurationEstimate,
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

const MAX_LEAF_SNIPPETS = 12;
const MAX_SNIP_LEN = 150;

function perProtocolStepBlock(p: LaboratoryProtocol): {
  id: string;
  title: string;
  leafCount: number;
  stepSummaries: string[];
} {
  const flat = flattenProtocolSteps([p]);
  const stepSummaries = flat
    .map((f) => f.summary.replace(/^\[[^\]]+]\s*/, "").trim().slice(0, MAX_SNIP_LEN))
    .filter(Boolean)
    .slice(0, MAX_LEAF_SNIPPETS);
  return { id: p.id, title: p.title, leafCount: flat.length, stepSummaries };
}

function protocolQuerySnapshot(
  protocols: LaboratoryProtocol[]
): { id: string; title: string; digest: string }[] {
  return protocols.map((p) => {
    const lines = flattenProtocolSteps([p]);
    const first = (lines[0]?.summary || p.objective || p.title)
      .replace(/^\[[^\]]+]\s*/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
    return { id: p.id, title: p.title, digest: first };
  });
}

/**
 * Reconcile per-protocol entries from the model with the actual protocol list
 * (stable ids and titles) so a malformed response never drops an SOP.
 */
function ensureProtocolDurations(
  rawList: unknown,
  protocols: LaboratoryProtocol[]
): ProtocolDurationEstimate[] {
  const asArr = Array.isArray(rawList) ? rawList : [];
  const byId = new Map<string, string>();
  for (const r of asArr) {
    const o = (r as Record<string, unknown>) || {};
    const id = String(o.id || "").trim();
    if (!id) continue;
    const duration = String(o.duration || "TBD").trim() || "TBD";
    if (!byId.has(id)) byId.set(id, duration);
  }

  if (protocols.length) {
    return protocols.map((p) => {
      const d = byId.get(p.id);
      return { id: p.id, name: p.title, duration: d && d.length ? d : "TBD" };
    });
  }
  // Edge case: no protocol objects; keep model rows if any
  return asArr.map((r) => {
    const o = r as Record<string, unknown>;
    return {
      id: String(o.id || "—").trim() || "—",
      name: String(o.name || "Protocol").trim() || "Protocol",
      duration: String(o.duration || "TBD").trim() || "TBD",
    };
  });
}

function parseConstraintList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).map((c) => String(c).trim()).filter(Boolean);
}

function parse(
  raw: Record<string, unknown>,
  flat: FlattenedProcedureLine[],
  protocols: LaboratoryProtocol[]
): TimelinePlan {
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
  const duration_constraints = parseConstraintList(raw.constraints);
  const protocol_durations = ensureProtocolDurations(raw.protocols, protocols);

  return {
    steps_timeline: steps_timeline.length
      ? steps_timeline
      : flat.length
        ? flat.map((line, j) => ({
            step_number: line.step_number || j + 1,
            step: line.summary,
            estimated_duration: "TBD",
            type: "execution" as const,
          }))
        : [{ step_number: 1, step: "Experiment", estimated_duration: "TBD", type: "execution" }],
    phases: phases.length
      ? phases
      : [{ name: "Run protocol", duration: "TBD", deliverables: ["raw + processed data"] }],
    total_duration: String(raw.total_duration || "TBD").trim() || "TBD",
    dependencies: dependencies.length
      ? dependencies
      : ["sequential step completion before final analysis"],
    web_duration_note: undefined,
    protocol_durations,
    duration_constraints: duration_constraints.length
      ? duration_constraints
      : [
          "Durations are conservative, lab-dependent estimates.",
          "Biological and incubation work typically spans at least 24h where applicable.",
        ],
  };
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

  // ── 1) One small LLM call: duration-focused search query
  const queryPayload = await completeJson(openai, {
    system: TIMELINE_QUERY_SYSTEM,
    user: buildTimelineQueryUser(hypothesis, protocolQuerySnapshot(protocols)),
    max_tokens: 150,
  });
  const searchQuery = String((queryPayload as { query?: unknown }).query || "").trim();
  const tavilyQuery = searchQuery || "typical laboratory experiment duration days weeks incubation";

  // ── 2) Exactly ONE Tavily call
  let tavilyText = "";
  try {
    const hits = await runTavilySearch({
      tavilyKey,
      query: tavilyQuery,
      maxResults: 4,
    });
    tavilyText = hits.map((h) => `${h.title}\n${(h.content || "").trim()}`).join("\n\n---\n\n");
    log("timeline_generation", "tavily", { queryLen: tavilyQuery.length, len: tavilyText.length, hits: hits.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("timeline_generation", "tavily_failed", { error: msg });
  }

  const perProtocol = protocols.map(perProtocolStepBlock);
  if (!perProtocol.length) {
    return parse(
      { constraints: [], protocols: [], phases: [], total_duration: "TBD", dependencies: [], steps_timeline: [] },
      flat,
      []
    );
  }

  // ── 3) One merged LLM call: constraints + per-protocol + phases + compact steps_timeline
  const raw = await completeJson(openai, {
    system: TIMELINE_MERGE_SYSTEM,
    user: buildTimelineMergeUser({ hypothesis, tavilyText, perProtocol }),
    max_tokens: 3000,
  });
  const out = parse(raw, flat, protocols);
  out.web_duration_note = tavilyText ? tavilyText.slice(0, 2000) : undefined;

  log("timeline_generation", "complete", {
    phases: out.phases.length,
    protocols: out.protocol_durations.length,
    tavily_query: tavilyQuery.slice(0, 200),
  });
  return out;
}
