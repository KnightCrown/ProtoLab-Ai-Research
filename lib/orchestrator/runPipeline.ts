import OpenAI from "openai";
import { extractRulesFromIssues } from "@/lib/feedback/extractRules";
import { getTopRules, upsertRules } from "@/lib/feedback/feedbackStore";
import { analyzeHypothesis } from "@/lib/pipeline/analyzeHypothesis";
import { extractMaterialsFromProtocol } from "@/lib/pipeline/extractMaterialsFromProtocol";
import { generateCost } from "@/lib/pipeline/generateCost";
import { generateSingleProtocol } from "@/lib/pipeline/generateProtocol";
import { generateTimeline } from "@/lib/pipeline/generateTimeline";
import { generateTrustScore } from "@/lib/pipeline/generateTrustScore";
import { generateValidation } from "@/lib/pipeline/generateValidation";
import { estimateStaffing } from "@/lib/pipeline/estimateStaffing";
import { literatureQC } from "@/lib/pipeline/literatureQC";
import { loadProtocolExample } from "@/lib/pipeline/loadProtocolExample";
import { loadProtocolRules } from "@/lib/pipeline/loadProtocolRules";
import { mapConcurrent } from "@/lib/pipeline/mapConcurrent";
import { planProtocols } from "@/lib/pipeline/planProtocols";
import { researchMaterials } from "@/lib/pipeline/researchMaterials";
import { makeTimedLog, PipelineTimer } from "@/lib/pipeline/stageTimer";
import type {
  AppliedFeedbackRule,
  LaboratoryProtocol,
  PipelineLogFn,
  PipelineResult,
} from "@/lib/pipeline/types";

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
/** Match concurrency to the cap so all SOPs fire at once. */
const PROTOCOL_GENERATION_CONCURRENCY = 6;
/** How many learned rules to inject into the next generation (avoids prompt bloat). */
const MAX_APPLIED_FEEDBACK_RULES = 8;

export async function runPipeline(opts: RunPipelineOptions): Promise<PipelineResult> {
  const rawLog = opts.log ?? defaultLog;
  const hypothesis = opts.hypothesis.trim();
  if (!hypothesis) {
    throw new PipelineStageError("input", "Hypothesis is empty");
  }

  // Per-request timer — never a module-level singleton, so parallel HTTP
  // requests each get their own independent accumulator.
  const pipelineTimer = new PipelineTimer();
  const log = makeTimedLog(rawLog, pipelineTimer);

  const openai = new OpenAI({ apiKey: opts.openaiApiKey });

  try {
    // Fire file reads immediately — they'll almost certainly finish before
    // protocol generation begins regardless of when they're awaited.
    const rulesExamplePromise = Promise.all([loadProtocolRules(), loadProtocolExample()]);

    // Stage 0: load top feedback rules learned from prior runs and inject
    //          them into the planning + protocol generation prompts. This
    //          is the "Learn → Improve Next Generation" half of the loop.
    const topFeedbackRules = await getTopRules(MAX_APPLIED_FEEDBACK_RULES);
    const appliedFixes = topFeedbackRules.map((r) => r.fix);
    const applied_rules: AppliedFeedbackRule[] = topFeedbackRules.map((r) => ({
      type: r.type,
      fix: r.fix,
    }));
    log("feedback_rules", "applied", {
      count: appliedFixes.length,
      types: applied_rules.map((r) => r.type),
    });

    // Stage 1: analyse hypothesis.
    const hypothesis_analysis = await analyzeHypothesis(openai, hypothesis, log);

    // Stage 2: literature QC and protocol planning share only `hypothesis_analysis` —
    // run them in parallel to save the full wall time of whichever finishes first.
    const [literature_qc, rawPlan] = await Promise.all([
      literatureQC(openai, opts.tavilyApiKey, hypothesis, hypothesis_analysis, log),
      planProtocols(openai, hypothesis, hypothesis_analysis, log, appliedFixes),
    ]);

    let protocol_plan = rawPlan;
    if (protocol_plan.length > MAX_PROTOCOLS_IN_PLAN) {
      log("orchestrator", "protocol_plan_capped", {
        before: protocol_plan.length,
        after: MAX_PROTOCOLS_IN_PLAN,
      });
      protocol_plan = protocol_plan.slice(0, MAX_PROTOCOLS_IN_PLAN);
    }

    // Stage 3: generate SOPs. File reads are almost certainly done by now.
    const [rules, example] = await rulesExamplePromise;
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
          log,
          appliedFixes
        )
    );
    if (protocols.length !== protocol_plan.length) {
      throw new PipelineStageError("orchestrator", "Protocol list length mismatch after generation");
    }

    // Stage 4: independent post-protocol tasks run in parallel:
    //   • extractMaterials  (feeds researchMaterials → cost → staffing)
    //   • generateTimeline  (only needs protocols + hypothesis + web search)
    //   • generateValidation (only needs hypothesis + analysis + protocols)
    const [materials_extracted, timeline, validation] = await Promise.all([
      extractMaterialsFromProtocol(openai, protocols, log),
      generateTimeline(openai, opts.tavilyApiKey, hypothesis, protocols, log),
      generateValidation(openai, hypothesis, hypothesis_analysis, protocols, log),
    ]);

    // Stage 5: materials research chain (serial dependency on extracted list).
    const materials = await researchMaterials(
      openai,
      opts.tavilyApiKey,
      materials_extracted,
      log
    );
    const cost_estimate = await generateCost(openai, materials, log);

    // Stage 6: staffing is synchronous and needs the completed timeline.
    const staffing = estimateStaffing(protocols, timeline, log);

    // Stage 7: trust scoring (single LLM call + rule checks).
    const trust_score = await generateTrustScore(
      openai,
      { protocols, materials, cost_estimate, timeline, staffing, validation },
      log
    );

    // Stage 8: learn — convert this run's trust-score issues into reusable
    //          feedback rules and persist them. Failures are non-fatal:
    //          the pipeline result must always be returned even if the
    //          feedback store is unwritable (e.g. read-only FS).
    try {
      const newRules = extractRulesFromIssues(trust_score.issues);
      if (newRules.length > 0) {
        await upsertRules(newRules);
        log("feedback_rules", "stored", { new_rules: newRules.length });
      }
    } catch (e) {
      log("feedback_rules", "store_failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const summary = pipelineTimer.summary();
    log("summary", "pipeline_complete", summary);

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
      trust_score,
      applied_rules,
    };
  } catch (e) {
    if (e instanceof PipelineStageError) throw e;
    const message = e instanceof Error ? e.message : String(e);
    throw new PipelineStageError("orchestrator", message, e);
  }
}
