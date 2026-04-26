import type OpenAI from "openai";
import {
  buildPlanProtocolsUserMessage,
  PLAN_PROTOCOLS_SYSTEM,
} from "@/lib/prompts/planProtocolsPrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import type { HypothesisAnalysis, PipelineLogFn, ProtocolPlanItem } from "@/lib/pipeline/types";

function parsePlan(o: unknown): ProtocolPlanItem[] {
  if (!o || typeof o !== "object") return [];
  const raw = o as Record<string, unknown>;
  const arr = raw.protocol_plan;
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  return arr
    .map((row, i) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id || `proto-${i + 1}`).trim() || `proto-${i + 1}`,
        name: String(r.name || `Protocol ${i + 1}`).trim() || `Protocol ${i + 1}`,
        description: String(r.description || "—").trim() || "—",
      } satisfies ProtocolPlanItem;
    })
    .filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
}

export async function planProtocols(
  openai: OpenAI,
  hypothesis: string,
  analysis: HypothesisAnalysis,
  log: PipelineLogFn,
  appliedFixes: string[] = []
): Promise<ProtocolPlanItem[]> {
  log("plan_protocols", "start", { applied_fixes: appliedFixes.length });
  const raw = await completeJson(openai, {
    system: PLAN_PROTOCOLS_SYSTEM,
    user: buildPlanProtocolsUserMessage(hypothesis, analysis, appliedFixes),
    max_tokens: 2000,
    model: "gpt-4o-mini",
  });
  const plan = parsePlan(raw);
  if (plan.length < 1) {
    throw new Error("Protocol planning must return at least one protocol in protocol_plan");
  }
  if (plan.length < 2) {
    log("plan_protocols", "note", { message: "only one procedure planned; consider splitting" });
  }
  log("plan_protocols", "complete", { count: plan.length });
  return plan;
}
