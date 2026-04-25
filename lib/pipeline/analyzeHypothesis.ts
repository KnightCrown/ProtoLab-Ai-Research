import type OpenAI from "openai";
import {
  buildHypothesisUserMessage,
  HYPOTHESIS_JSON_KEYS,
  HYPOTHESIS_SYSTEM,
} from "@/lib/prompts/hypothesisPrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import type { HypothesisAnalysis, PipelineLogFn } from "@/lib/pipeline/types";

function asStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.map((a) => String(a).trim()).filter(Boolean);
}

function asObj(x: unknown): Record<string, unknown> {
  if (x && typeof x === "object" && !Array.isArray(x)) return x as Record<string, unknown>;
  return { description: String(x || "unspecified") };
}

function parseAnalysis(raw: Record<string, unknown>): HypothesisAnalysis {
  return {
    independent_variables: asStringArray(raw.independent_variables),
    dependent_variables: asStringArray(raw.dependent_variables),
    control_group: asObj(raw.control_group),
    experimental_groups: asStringArray(raw.experimental_groups),
    measurement_method: String(raw.measurement_method || "unspecified").trim() || "unspecified",
    success_criteria: String(raw.success_criteria || "unspecified").trim() || "unspecified",
  };
}

export async function analyzeHypothesis(
  openai: OpenAI,
  hypothesis: string,
  log: PipelineLogFn
): Promise<HypothesisAnalysis> {
  log("hypothesis_analysis", "start", { len: hypothesis.length });
  const raw = await completeJson(openai, {
    system: HYPOTHESIS_SYSTEM,
    user: buildHypothesisUserMessage(hypothesis, HYPOTHESIS_JSON_KEYS),
    max_tokens: 900,
  });
  const analysis = parseAnalysis(raw);
  log("hypothesis_analysis", "complete", {
    iv: analysis.independent_variables.length,
    dv: analysis.dependent_variables.length,
  });
  return analysis;
}
