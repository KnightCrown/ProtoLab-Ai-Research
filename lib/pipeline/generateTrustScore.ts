import type OpenAI from "openai";
import { completeJson } from "@/lib/pipeline/openaiJson";
import {
  buildTrustScoreUserMessage,
  parseTrustScoreRaw,
  TRUST_SCORE_SYSTEM,
} from "@/lib/prompts/trustScorePrompt";
import type { PipelineLogFn, TrustConfidence, TrustScore } from "@/lib/pipeline/types";

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function hasControlGroup(protocolsText: string): boolean {
  return /\bcontrol\b/.test(protocolsText);
}

function hasValidationMethod(validationText: string): boolean {
  if (!validationText) return false;
  if (/^tbd$|^unspecified$/.test(validationText)) return false;
  return validationText.length > 5;
}

function parseDurationToDays(raw: string): number | null {
  const text = normalize(raw);
  if (!text) return null;

  const units: Array<{ pattern: RegExp; factor: number }> = [
    { pattern: /(day|days)\b/, factor: 1 },
    { pattern: /(week|weeks)\b/, factor: 7 },
    { pattern: /(month|months)\b/, factor: 30 },
  ];

  for (const unit of units) {
    const match = text.match(/(\d+(?:\.\d+)?)/);
    if (match && unit.pattern.test(text)) {
      return Math.max(0, Math.round(Number(match[1]) * unit.factor));
    }
  }
  return null;
}

function scorePenaltyToConfidence(score: number): TrustConfidence {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function combineConfidence(a: TrustConfidence, b: TrustConfidence): TrustConfidence {
  const rank: Record<TrustConfidence, number> = { low: 0, medium: 1, high: 2 };
  return rank[a] < rank[b] ? a : b;
}

export async function generateTrustScore(
  openai: OpenAI,
  input: {
    protocols: Parameters<typeof buildTrustScoreUserMessage>[0]["protocols"];
    materials: Parameters<typeof buildTrustScoreUserMessage>[0]["materials"];
    cost_estimate: Parameters<typeof buildTrustScoreUserMessage>[0]["cost_estimate"];
    timeline: Parameters<typeof buildTrustScoreUserMessage>[0]["timeline"];
    staffing: Parameters<typeof buildTrustScoreUserMessage>[0]["staffing"];
    validation: Parameters<typeof buildTrustScoreUserMessage>[0]["validation"];
  },
  log: PipelineLogFn
): Promise<TrustScore> {
  log("trust_score_generation", "start", {});

  const protocolsText = normalize(JSON.stringify(input.protocols));
  const validationText = normalize(
    `${input.validation.measurement_method} ${input.validation.statistical_test} ${input.validation.success_criteria}`
  );
  const materialsMissing = input.materials.length === 0;
  const timelineDays = parseDurationToDays(input.timeline.total_duration);

  const ruleIssues: string[] = [];
  let rulePenalty = 0;

  if (!hasControlGroup(protocolsText)) {
    ruleIssues.push("No explicit control group detected in protocol.");
    rulePenalty += 10;
  }

  if (timelineDays !== null && timelineDays < 7) {
    ruleIssues.push("Timeline appears unrealistically short (< 7 days).");
    rulePenalty += 10;
  }

  if (!hasValidationMethod(validationText)) {
    ruleIssues.push("Validation method is missing or unspecified.");
    rulePenalty += 12;
  }

  if (materialsMissing) {
    ruleIssues.push("Materials list is missing.");
    rulePenalty += 15;
  }

  const raw = await completeJson(openai, {
    system: TRUST_SCORE_SYSTEM,
    user: buildTrustScoreUserMessage(input),
    max_tokens: 500,
  });

  const llm = parseTrustScoreRaw(raw);
  const mergedIssues = Array.from(new Set([...ruleIssues, ...llm.issues]));
  const mergedScore = Math.max(0, Math.min(100, llm.score - rulePenalty));
  const mergedConfidence = combineConfidence(llm.confidence, scorePenaltyToConfidence(mergedScore));

  const out: TrustScore = {
    score: mergedScore,
    issues: mergedIssues,
    confidence: mergedConfidence,
  };
  log("trust_score_generation", "complete", {
    issues: out.issues.length,
    score: out.score,
    confidence: out.confidence,
    rule_penalty: rulePenalty,
  });
  return out;
}
