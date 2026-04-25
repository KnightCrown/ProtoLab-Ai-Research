import OpenAI from "openai";
import { analyzeHypothesis } from "@/lib/pipeline/analyzeHypothesis";
import { generateCost } from "@/lib/pipeline/generateCost";
import { generateMaterials } from "@/lib/pipeline/generateMaterials";
import { generateProtocol } from "@/lib/pipeline/generateProtocol";
import { generateTimeline } from "@/lib/pipeline/generateTimeline";
import { generateValidation } from "@/lib/pipeline/generateValidation";
import { literatureQC } from "@/lib/pipeline/literatureQC";
import { loadProtocolRules } from "@/lib/pipeline/loadProtocolRules";
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
  /** default: console logger */
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
    const protocol = await generateProtocol(
      openai,
      hypothesis,
      hypothesis_analysis,
      rules,
      log
    );
    const materials = await generateMaterials(
      openai,
      hypothesis,
      hypothesis_analysis,
      protocol,
      log
    );
    const cost_estimate = await generateCost(openai, materials, log);
    const timeline = await generateTimeline(
      openai,
      hypothesis,
      hypothesis_analysis,
      protocol,
      materials,
      log
    );
    const validation = await generateValidation(
      openai,
      hypothesis,
      hypothesis_analysis,
      protocol,
      log
    );

    return {
      hypothesis_analysis,
      literature_qc,
      protocol,
      materials,
      cost_estimate,
      timeline,
      validation,
    };
  } catch (e) {
    if (e instanceof PipelineStageError) throw e;
    const message = e instanceof Error ? e.message : String(e);
    throw new PipelineStageError("orchestrator", message, e);
  }
}
