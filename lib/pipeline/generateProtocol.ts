import type OpenAI from "openai";
import {
  buildSingleProtocolSystemMessage,
  buildSingleProtocolUserMessage,
} from "@/lib/prompts/protocolPrompt";
import type { ProtocolExamplePayload } from "@/lib/pipeline/loadProtocolExample";
import type { ProtocolRulesPayload } from "@/lib/pipeline/loadProtocolRules";
import { completeJson } from "@/lib/pipeline/openaiJson";
import { countLeafSteps } from "@/lib/pipeline/protocolFlatten";
import { refineProtocolSteps } from "@/lib/pipeline/refineProtocolSteps";
import type {
  HypothesisAnalysis,
  LaboratoryProtocol,
  PipelineLogFn,
  ProcedureStep,
  ProtocolConditions,
  ProtocolPlanItem,
} from "@/lib/pipeline/types";

function parseConditions(x: unknown): ProtocolConditions | undefined {
  if (!x || typeof x !== "object") return undefined;
  const o = x as Record<string, unknown>;
  const c: ProtocolConditions = {};
  if (o.time != null) c.time = String(o.time);
  if (o.temperature != null) c.temperature = String(o.temperature);
  if (o.concentration != null) c.concentration = String(o.concentration);
  if (o.other != null) c.other = String(o.other);
  if (![c.time, c.temperature, c.concentration, c.other].some((v) => v && String(v).trim())) {
    return undefined;
  }
  return c;
}

function hasLeafContent(s: ProcedureStep): boolean {
  if (s.sub_steps?.length && s.sub_steps.some(hasLeafContent)) {
    return true;
  }
  const hasCond = s.conditions && Object.values(s.conditions).some((v) => v && String(v).trim());
  return Boolean(
    s.text?.trim() ||
      s.action?.trim() ||
      s.inputs?.length ||
      s.quantities?.trim() ||
      s.output?.trim() ||
      s.observation?.trim() ||
      hasCond
  );
}

function parseProcedureStep(o: Record<string, unknown>, index: number): ProcedureStep {
  const subRaw = o.sub_steps;
  const sub_steps = Array.isArray(subRaw)
    ? (subRaw as unknown[]).map((r, j) => parseProcedureStep(r as Record<string, unknown>, j))
    : undefined;
  const inputs = Array.isArray(o.inputs)
    ? (o.inputs as unknown[]).map((i) => String(i).trim()).filter(Boolean)
    : undefined;
  const cond = parseConditions(o.conditions);
  const out: ProcedureStep = {
    step_number: typeof o.step_number === "number" ? o.step_number : index + 1,
  };
  if (o.kind != null) out.kind = String(o.kind).trim() || undefined;
  if (o.text != null) {
    const t = String(o.text).trim();
    if (t) out.text = t;
  }
  if (o.action != null) {
    const t = String(o.action).trim();
    if (t) out.action = t;
  }
  if (inputs?.length) out.inputs = inputs;
  if (o.quantities != null) {
    const t = String(o.quantities).trim();
    if (t) out.quantities = t;
  }
  if (cond) out.conditions = cond;
  if (o.output != null) {
    const t = String(o.output).trim();
    if (t) out.output = t;
  }
  if (o.observation != null) {
    const t = String(o.observation).trim();
    if (t) out.observation = t;
  }
  if (sub_steps?.length) out.sub_steps = sub_steps;
  return out;
}

function parseNotes(raw: Record<string, unknown>): string[] | undefined {
  if (raw.notes != null) {
    if (Array.isArray(raw.notes)) {
      const n = (raw.notes as unknown[]).map((x) => String(x).trim()).filter(Boolean);
      return n.length ? n : undefined;
    }
    const t = String(raw.notes).trim();
    return t ? [t] : undefined;
  }
  if (raw.notes_and_calculations != null) {
    if (Array.isArray(raw.notes_and_calculations)) {
      const n = (raw.notes_and_calculations as unknown[]).map((x) => String(x).trim()).filter(Boolean);
      return n.length ? n : undefined;
    }
    const t = String(raw.notes_and_calculations).trim();
    return t ? [t] : undefined;
  }
  return undefined;
}

/**
 * Unwrap a single protocol object from the model (may be nested under "protocol" by mistake).
 */
function unwrapSingle(raw: Record<string, unknown>): Record<string, unknown> {
  const p = raw.protocol;
  if (p && typeof p === "object" && !Array.isArray(p)) {
    return p as Record<string, unknown>;
  }
  return raw;
}

function parseSingleProtocol(
  rawIn: Record<string, unknown>,
  planItem: ProtocolPlanItem
): LaboratoryProtocol {
  const raw = unwrapSingle(rawIn);
  const title =
    String(raw.title || planItem.name).trim() || planItem.name;
  const objective = String(raw.objective || "").trim() || "—";
  const matRaw = Array.isArray(raw.materials) ? (raw.materials as unknown[]) : [];
  const materials = matRaw.map((m) => String(m).trim()).filter(Boolean);
  const procRaw = raw.procedure ?? raw.steps;
  const arr = Array.isArray(procRaw) ? procRaw : [];
  const procedure = arr.map((s, j) => parseProcedureStep(s as Record<string, unknown>, j));
  if (procedure.length < 1) {
    throw new Error(`Protocol "${title}" must include a non-empty procedure[]`);
  }
  for (const step of procedure) {
    if (!hasLeafContent(step)) {
      throw new Error(
        `Protocol "${title}": each procedure step must be substantive (use text, action, or nested sub_steps with content)`
      );
    }
  }
  if (materials.length < 2) {
    throw new Error(
      `Protocol "${title}": list at least 2 materials (reagents, consumables, or key equipment)`
    );
  }
  const notes = parseNotes(raw);
  const fromModel = String(raw.id || "").trim();
  const id = fromModel && fromModel === planItem.id ? fromModel : planItem.id;
  const proto: LaboratoryProtocol = {
    id,
    title,
    objective,
    materials,
    procedure,
  };
  if (notes?.length) proto.notes = notes;
  return proto;
}

/**
 * Generate and refine a single laboratory SOP for one planned procedure.
 *
 * Two sequential LLM calls are made:
 *   1. Protocol generation — produces the full SOP structure (title, objective,
 *      materials, procedure, notes) from the rulebook + example + plan context.
 *   2. Step refinement — rewrites every procedure step's `text` field into a
 *      complete, executable Methods-section sentence (see refineProtocolSteps).
 *
 * This function is called concurrently for every plan item via mapConcurrent,
 * so both LLM calls for all protocols overlap in parallel.
 */
export async function generateSingleProtocol(
  openai: OpenAI,
  hypothesis: string,
  analysis: HypothesisAnalysis,
  planItem: ProtocolPlanItem,
  rules: ProtocolRulesPayload,
  example: ProtocolExamplePayload,
  log: PipelineLogFn,
  appliedFixes: string[] = []
): Promise<LaboratoryProtocol> {
  const label = planItem.id;
  log("protocol_generation", "start", { plan_id: label, name: planItem.name });

  // Call 1: generate the full SOP structure.
  const raw = await completeJson(openai, {
    system: buildSingleProtocolSystemMessage(rules, example),
    user: buildSingleProtocolUserMessage(hypothesis, analysis, planItem, appliedFixes),
    max_tokens: 6000,
    model: "gpt-4o-mini",
  });

  const proto = parseSingleProtocol(raw as Record<string, unknown>, planItem);

  // Guard: a protocol with fewer than 3 substantive steps is not usable.
  if (countLeafSteps([proto]) < 3) {
    throw new Error(
      `Protocol "${proto.title}": procedure needs at least 3 leaf steps (or equivalent nested steps)`
    );
  }
  log("protocol_generation", "complete", { plan_id: label, leaves: countLeafSteps([proto]) });

  // Call 2: rewrite raw step text into precise, executable Methods-section sentences.
  const refined = await refineProtocolSteps(openai, { ...proto, id: planItem.id }, hypothesis, analysis, planItem, log);
  return refined;
}
