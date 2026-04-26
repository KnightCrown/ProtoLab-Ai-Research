import OpenAI from "openai";
import { analyzeHypothesis } from "@/lib/pipeline/analyzeHypothesis";
import { extractMaterialsFromProtocol } from "@/lib/pipeline/extractMaterialsFromProtocol";
import { generateCost } from "@/lib/pipeline/generateCost";
import { generateSingleProtocol } from "@/lib/pipeline/generateProtocol";
import { generateTimeline } from "@/lib/pipeline/generateTimeline";
import { generateValidation } from "@/lib/pipeline/generateValidation";
import { estimateStaffing } from "@/lib/pipeline/estimateStaffing";
import { literatureQC } from "@/lib/pipeline/literatureQC";
import { loadProtocolExample } from "@/lib/pipeline/loadProtocolExample";
import { loadProtocolRules } from "@/lib/pipeline/loadProtocolRules";
import { mapConcurrent } from "@/lib/pipeline/mapConcurrent";
import { planProtocols } from "@/lib/pipeline/planProtocols";
import { researchMaterials } from "@/lib/pipeline/researchMaterials";
import type { LaboratoryProtocol, PipelineLogFn, PipelineResult } from "@/lib/pipeline/types";

export class PipelineStageError extends Error {
  constructor(
    public readonly stage: string,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "PipelineStageError";
  }
}

export type RunPipelineOptions = {
  openaiApiKey: string;
  tavilyApiKey: string;
  hypothesis: string;
  log?: PipelineLogFn;
};

const defaultLog: PipelineLogFn = (stage, message, detail) => {
  if (detail !== undefined) {
    console.info(`[pipeline:${stage}] ${message}`, detail);
  } else {
    console.info(`[pipeline:${stage}] ${message}`);
  }
};

/** Cap planned procedures to keep latency predictable (planner can over-split). */
const MAX_PROTOCOLS_IN_PLAN = 6;
/** OpenAI calls run in parallel; limit avoids rate limits while beating sequential wall time. */
const PROTOCOL_GENERATION_CONCURRENCY = 4;

export async function runPipeline(opts: RunPipelineOptions): Promise<PipelineResult> {
  const log = opts.log ?? defaultLog;
  const hypothesis = opts.hypothesis.trim();
  if (!hypothesis) {
    throw new PipelineStageError("input", "Hypothesis is empty");
  }

  const openai = new OpenAI({ apiKey: opts.openaiApiKey });

  try {
    const hypothesis_analysis = await analyzeHypothesis(openai, hypothesis, log);
    const literature_qc = await literatureQC(
      openai,
      opts.tavilyApiKey,
      hypothesis,
      hypothesis_analysis,
      log
    );
    let protocol_plan = await planProtocols(openai, hypothesis, hypothesis_analysis, log);
    if (protocol_plan.length > MAX_PROTOCOLS_IN_PLAN) {
      log("orchestrator", "protocol_plan_capped", {
        before: protocol_plan.length,
        after: MAX_PROTOCOLS_IN_PLAN,
      });
      protocol_plan = protocol_plan.slice(0, MAX_PROTOCOLS_IN_PLAN);
    }
    const [rules, example] = await Promise.all([loadProtocolRules(), loadProtocolExample()]);
    const protocols: LaboratoryProtocol[] = await mapConcurrent(
      protocol_plan,
      PROTOCOL_GENERATION_CONCURRENCY,
      (item) =>
        generateSingleProtocol(
          openai,
          hypothesis,
          hypothesis_analysis,
          item,
          rules,
          example,
          log
        )
    );
    if (protocols.length !== protocol_plan.length) {
      throw new PipelineStageError("orchestrator", "Protocol list length mismatch after generation");
    }
    const materials_extracted = await extractMaterialsFromProtocol(openai, protocols, log);
    const materials = await researchMaterials(
      openai,
      opts.tavilyApiKey,
      materials_extracted,
      log
    );
    const cost_estimate = await generateCost(openai, materials, log);
    const timeline = await generateTimeline(
      openai,
      opts.tavilyApiKey,
      hypothesis,
      protocols,
      log
    );
    const staffing = estimateStaffing(protocols, timeline, log);
    const validation = await generateValidation(
      openai,
      hypothesis,
      hypothesis_analysis,
      protocols,
      log
    );

    return {
      hypothesis_analysis,
      literature_qc,
      protocol_plan,
      protocols,
      materials_extracted,
      materials,
      cost_estimate,
      timeline,
      staffing,
      validation,
    };
  } catch (e) {
    if (e instanceof PipelineStageError) throw e;
    const message = e instanceof Error ? e.message : String(e);
    throw new PipelineStageError("orchestrator", message, e);
  }
}
