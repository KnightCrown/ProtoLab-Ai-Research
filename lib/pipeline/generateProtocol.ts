import type OpenAI from "openai";
import {
  buildProtocolSystemMessage,
  buildProtocolUserMessage,
} from "@/lib/prompts/protocolPrompt";
import type { ProtocolRulesPayload } from "@/lib/pipeline/loadProtocolRules";
import { completeJson } from "@/lib/pipeline/openaiJson";
import type { HypothesisAnalysis, PipelineLogFn, ProtocolStep } from "@/lib/pipeline/types";

function parseConditions(x: unknown): ProtocolStep["conditions"] {
  if (!x || typeof x !== "object") return { other: "unspecified" };
  const o = x as Record<string, unknown>;
  return {
    time: o.time != null ? String(o.time) : undefined,
    temperature: o.temperature != null ? String(o.temperature) : undefined,
    concentration: o.concentration != null ? String(o.concentration) : undefined,
    other: o.other != null ? String(o.other) : undefined,
  };
}

function parseStep(o: Record<string, unknown>, index: number): ProtocolStep {
  const inputs = Array.isArray(o.inputs)
    ? (o.inputs as unknown[]).map((i) => String(i).trim()).filter(Boolean)
    : [];
  const cond = parseConditions(o.conditions);
  const hasCond = [cond.time, cond.temperature, cond.concentration, cond.other].some(
    (v) => v && String(v).trim()
  );
  if (!hasCond) {
    cond.other = (cond.other || "") + (cond.other ? "; " : "") + "conditions: verify in pilot (not specified)";
  }
  return {
    step_number: typeof o.step_number === "number" ? o.step_number : index + 1,
    action: String(o.action || "action unspecified").trim() || "action unspecified",
    inputs: inputs.length ? inputs : ["see protocol context"],
    conditions: cond,
    output: String(o.output || "output unspecified").trim() || "output unspecified",
  };
}

export async function generateProtocol(
  openai: OpenAI,
  hypothesis: string,
  analysis: HypothesisAnalysis,
  rules: ProtocolRulesPayload,
  log: PipelineLogFn
): Promise<ProtocolStep[]> {
  log("protocol_generation", "start", { rules_version: rules.version });
  const raw = await completeJson(openai, {
    system: buildProtocolSystemMessage(rules),
    user: buildProtocolUserMessage(hypothesis, analysis),
    max_tokens: 4000,
    model: "gpt-4o-mini",
  });
  const stepsRaw = raw.steps;
  if (!Array.isArray(stepsRaw) || stepsRaw.length < 3) {
    throw new Error("Protocol must include at least 3 structured steps");
  }
  const steps = stepsRaw.map((s, i) =>
    parseStep(s as Record<string, unknown>, i)
  );
  log("protocol_generation", "complete", { steps: steps.length });
  return steps;
}
