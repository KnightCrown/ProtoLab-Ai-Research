import type {
  LaboratoryProtocol,
  ResearchedMaterial,
  StaffingPlan,
  TimelinePlan,
  TrustConfidence,
  ValidationPlan,
} from "@/lib/pipeline/types";

const TRUST_SCHEMA = `{
  "score": number,
  "issues": string[],
  "confidence": "low" | "medium" | "high"
}`;

export const TRUST_SCORE_SYSTEM = `You are an expert scientist reviewing an experimental plan.
Evaluate based on completeness, realism, feasibility, and internal consistency.
Return JSON only in this schema: ${TRUST_SCHEMA}
Rules:
- score must be an integer from 0 to 100
- issues must be concise, concrete weaknesses
- confidence must be exactly one of: low, medium, high`;

function compactConfidence(value: unknown): TrustConfidence {
  const v = String(value || "").trim().toLowerCase();
  if (v === "low" || v === "medium" || v === "high") {
    return v;
  }
  return "medium";
}

export function parseTrustScoreRaw(raw: Record<string, unknown>): {
  score: number;
  issues: string[];
  confidence: TrustConfidence;
} {
  const parsedScore = Number(raw.score);
  const boundedScore = Number.isFinite(parsedScore)
    ? Math.max(0, Math.min(100, Math.round(parsedScore)))
    : 50;

  const issues = Array.isArray(raw.issues)
    ? raw.issues.map((x) => String(x).trim()).filter(Boolean)
    : [];

  return {
    score: boundedScore,
    issues,
    confidence: compactConfidence(raw.confidence),
  };
}

export function buildTrustScoreUserMessage(args: {
  protocols: LaboratoryProtocol[];
  materials: ResearchedMaterial[];
  cost_estimate: { total_cost: string; line_items: { label: string; amount: string }[] };
  timeline: TimelinePlan;
  staffing: StaffingPlan;
  validation: ValidationPlan;
}) {
  return `Evaluate this experiment plan.

PROTOCOL:
${JSON.stringify(args.protocols)}

MATERIALS:
${JSON.stringify(args.materials)}

COST:
${JSON.stringify(args.cost_estimate)}

TIMELINE:
${JSON.stringify(args.timeline)}

STAFFING:
${JSON.stringify(args.staffing)}

VALIDATION:
${JSON.stringify(args.validation)}`;
}
