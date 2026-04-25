import OpenAI from "openai";
import { analyzeHypothesis } from "@/lib/pipeline/analyzeHypothesis";
import { extractMaterialsFromProtocol } from "@/lib/pipeline/extractMaterialsFromProtocol";
import { generateCost } from "@/lib/pipeline/generateCost";
import { generateProtocol } from "@/lib/pipeline/generateProtocol";
import { generateTimeline } from "@/lib/pipeline/generateTimeline";
import { generateValidation } from "@/lib/pipeline/generateValidation";
import { estimateStaffing } from "@/lib/pipeline/estimateStaffing";
import { literatureQC } from "@/lib/pipeline/literatureQC";
import { loadProtocolRules } from "@/lib/pipeline/loadProtocolRules";
import { researchMaterials } from "@/lib/pipeline/researchMaterials";
import type { PipelineLogFn, PipelineResult } from "@/lib/pipeline/types";

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
    const rules = await loadProtocolRules();
    const protocols = await generateProtocol(
      openai,
      hypothesis,
      hypothesis_analysis,
      rules,
      log
    );
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
