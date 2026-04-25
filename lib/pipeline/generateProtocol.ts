import type OpenAI from "openai";
import {
  buildProtocolSystemMessage,
  buildProtocolUserMessage,
} from "@/lib/prompts/protocolPrompt";
import { loadProtocolExample } from "@/lib/pipeline/loadProtocolExample";
import type { ProtocolRulesPayload } from "@/lib/pipeline/loadProtocolRules";
import { completeJson } from "@/lib/pipeline/openaiJson";
import { countLeafSteps } from "@/lib/pipeline/protocolFlatten";
import type {
  HypothesisAnalysis,
  LaboratoryProtocol,
  PipelineLogFn,
  ProcedureStep,
  ProtocolConditions,
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

function parseProtocol(raw: Record<string, unknown>, index: number): LaboratoryProtocol {
  const id = String(raw.protocol_id || "").trim() || `proc-${index + 1}`;
  const title = String(raw.title || `Procedure ${index + 1}`).trim() || `Procedure ${index + 1}`;
  const objective = String(raw.objective || "").trim() || "—";
  const matRaw = Array.isArray(raw.materials) ? (raw.materials as unknown[]) : [];
  const materials = matRaw.map((m) => String(m).trim()).filter(Boolean);
  const procRaw = raw.procedure ?? raw.steps;
  const arr = Array.isArray(procRaw) ? procRaw : [];
  const procedure = arr.map((s, j) => parseProcedureStep(s as Record<string, unknown>, j));
  if (procedure.length < 1) {
    throw new Error(`Protocol "${title}" must include a non-empty procedure[]`);
  }
  let notes: string[] | undefined;
  if (raw.notes_and_calculations != null) {
    if (Array.isArray(raw.notes_and_calculations)) {
      notes = (raw.notes_and_calculations as unknown[]).map((n) => String(n).trim()).filter(Boolean);
    } else {
      const t = String(raw.notes_and_calculations).trim();
      if (t) notes = [t];
    }
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
  const proto: LaboratoryProtocol = {
    protocol_id: id,
    title,
    objective,
    materials,
    procedure,
  };
  if (notes?.length) proto.notes_and_calculations = notes;
  return proto;
}

export async function generateProtocol(
  openai: OpenAI,
  hypothesis: string,
  analysis: HypothesisAnalysis,
  rules: ProtocolRulesPayload,
  log: PipelineLogFn
): Promise<LaboratoryProtocol[]> {
  const example = await loadProtocolExample();
  log("protocol_generation", "start", { rules_version: rules.version, example_version: example.version });
  const raw = await completeJson(openai, {
    system: buildProtocolSystemMessage(rules, example),
    user: buildProtocolUserMessage(hypothesis, analysis),
    max_tokens: 12000,
    model: "gpt-4o-mini",
  });
  const protocolsRaw = raw.protocols;
  if (!Array.isArray(protocolsRaw) || protocolsRaw.length < 1) {
    throw new Error("Protocol generation must return a non-empty protocols array");
  }
  const protocols = protocolsRaw.map((p, i) => parseProtocol(p as Record<string, unknown>, i));
  for (const p of protocols) {
    if (countLeafSteps([p]) < 3) {
      throw new Error(
        `Protocol "${p.title}": add detail so the procedure has at least 3 leaf steps (or equivalent nested steps)`
      );
    }
  }
  log("protocol_generation", "complete", {
    procedureCount: protocols.length,
    leaves: countLeafSteps(protocols),
  });
  return protocols;
}
