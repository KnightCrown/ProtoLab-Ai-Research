import type OpenAI from "openai";
import { buildValidationUserMessage, VALIDATION_SYSTEM } from "@/lib/prompts/validationPrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import type { HypothesisAnalysis, PipelineLogFn, ProtocolStep, ValidationPlan } from "@/lib/pipeline/types";

function parse(raw: Record<string, unknown>): ValidationPlan {
  const err = Array.isArray(raw.sources_of_error)
    ? (raw.sources_of_error as unknown[]).map((s) => String(s).trim()).filter(Boolean)
    : [];
  return {
    measurement_method: String(raw.measurement_method || "TBD").trim() || "TBD",
    statistical_test: String(raw.statistical_test || "TBD").trim() || "TBD",
    success_criteria: String(raw.success_criteria || "TBD").trim() || "TBD",
    sources_of_error: err.length
      ? err
      : ["assay noise", "batch effects", "operator technique", "instrument drift", "reagent lot variability"],
  };
}

export async function generateValidation(
  openai: OpenAI,
  hypothesis: string,
  analysis: HypothesisAnalysis,
  protocol: ProtocolStep[],
  log: PipelineLogFn
): Promise<ValidationPlan> {
  log("validation_generation", "start", {});
  const raw = await completeJson(openai, {
    system: VALIDATION_SYSTEM,
    user: buildValidationUserMessage(hypothesis, analysis, protocol),
    max_tokens: 1000,
  });
  const out = parse(raw);
  log("validation_generation", "complete", {});
  return out;
}
