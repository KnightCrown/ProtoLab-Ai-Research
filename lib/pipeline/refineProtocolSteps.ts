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

/**
 * Walk the ProcedureStep tree and replace `text` on every step whose
 * step_number appears in the refinement map.  All other fields on the step
 * (kind, action, inputs, quantities, conditions, output, observation) are
 * left untouched so downstream consumers that read structured fields still
 * work correctly.  sub_steps are recursed into so nested step groups also
 * receive refined text.
 */
function applyRefinements(
  procedure: ProcedureStep[],
  map: Map<number, string>
): ProcedureStep[] {
  return procedure.map((step) => {
    const refined = map.get(step.step_number);
    // Spread first to avoid mutating the original object, then override text.
    const base: ProcedureStep = refined ? { ...step, text: refined } : step;
    if (base.sub_steps?.length) {
      base.sub_steps = applyRefinements(base.sub_steps, map);
    }
    return base;
  });
}

/**
 * Parse the model response into a step_number → refined-text map.
 * Handles both numeric and stringified step_number values in case the model
 * serialises them as strings.
 */
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
 * This is a second, focused LLM call that runs immediately after the initial
 * protocol generation.  It receives every raw step field as context and applies
 * 10 transformation rules (action verb, specificity, full sentences, tool naming,
 * quality clauses, conciseness, explicit units, actionability, purpose clauses,
 * step_number preservation).
 *
 * All other protocol fields (title, objective, materials, notes, sub_steps,
 * structural fields) are preserved unchanged.  If the model returns no usable
 * output the raw protocol is returned as-is — the stage never throws.
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

  // Scale the token budget with protocol length; 200 tokens per step is
  // generous enough for two full Methods sentences and a minimum floor of 2 500.
  const raw = await completeJson(openai, {
    system: REFINE_STEPS_SYSTEM,
    user: buildRefineStepsUser(protocol, hypothesis, analysis, plan),
    max_tokens: Math.max(2500, stepCount * 200),
    model: "gpt-4o-mini",
  });

  const map = parseRefined(raw);
  log("refine_steps", "refined", { plan_id: plan.id, refined: map.size, total: stepCount });

  // Graceful no-op: if the model returned nothing useful, keep the raw protocol
  // so the pipeline never stalls on a refinement failure.
  if (map.size === 0) {
    log("refine_steps", "warn_empty_refinement", { plan_id: plan.id });
    return protocol;
  }

  return {
    ...protocol,
    procedure: applyRefinements(protocol.procedure, map),
  };
}
