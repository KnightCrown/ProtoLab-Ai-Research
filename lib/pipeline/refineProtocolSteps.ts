import type OpenAI from "openai";
import { buildRefineStepsUser, REFINE_STEPS_SYSTEM } from "@/lib/prompts/refineStepsPrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import type {
  HypothesisAnalysis,
  LaboratoryProtocol,
  PipelineLogFn,
  ProcedureStep,
  ProtocolPlanItem,
} from "@/lib/pipeline/types";

/** Apply refined text back onto the original step tree, preserving all other fields. */
function applyRefinements(
  procedure: ProcedureStep[],
  map: Map<number, string>
): ProcedureStep[] {
  return procedure.map((step) => {
    const refined = map.get(step.step_number);
    const base: ProcedureStep = refined ? { ...step, text: refined } : step;
    if (base.sub_steps?.length) {
      base.sub_steps = applyRefinements(base.sub_steps, map);
    }
    return base;
  });
}

function parseRefined(raw: Record<string, unknown>): Map<number, string> {
  const map = new Map<number, string>();
  const arr = Array.isArray(raw.refined_steps) ? raw.refined_steps : [];
  for (const item of arr) {
    const o = item as Record<string, unknown>;
    const n = typeof o.step_number === "number" ? o.step_number : Number(o.step_number);
    const t = typeof o.text === "string" ? o.text.trim() : "";
    if (!isNaN(n) && t) map.set(n, t);
  }
  return map;
}

/**
 * Post-processes a generated protocol by rewriting each procedure step's `text`
 * into a complete, executable Methods-section sentence.
 *
 * All other protocol fields (title, objective, materials, notes, sub_steps,
 * structural fields) are preserved unchanged.
 */
export async function refineProtocolSteps(
  openai: OpenAI,
  protocol: LaboratoryProtocol,
  hypothesis: string,
  analysis: HypothesisAnalysis,
  plan: ProtocolPlanItem,
  log: PipelineLogFn
): Promise<LaboratoryProtocol> {
  const stepCount = protocol.procedure.length;
  log("refine_steps", "start", { plan_id: plan.id, steps: stepCount });

  const raw = await completeJson(openai, {
    system: REFINE_STEPS_SYSTEM,
    user: buildRefineStepsUser(protocol, hypothesis, analysis, plan),
    max_tokens: Math.max(2500, stepCount * 200),
    model: "gpt-4o-mini",
  });

  const map = parseRefined(raw);
  log("refine_steps", "refined", { plan_id: plan.id, refined: map.size, total: stepCount });

  if (map.size === 0) {
    log("refine_steps", "warn_empty_refinement", { plan_id: plan.id });
    return protocol;
  }

  return {
    ...protocol,
    procedure: applyRefinements(protocol.procedure, map),
  };
}
