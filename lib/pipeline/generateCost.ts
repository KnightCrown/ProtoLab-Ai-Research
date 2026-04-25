import type OpenAI from "openai";
import { buildCostUserMessage, COST_SYSTEM } from "@/lib/prompts/costPrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import type { CostEstimate, MaterialItem, PipelineLogFn } from "@/lib/pipeline/types";

function parseCost(raw: Record<string, unknown>): CostEstimate {
  const li = Array.isArray(raw.line_items) ? raw.line_items : [];
  const line_items = li
    .map((r) => {
      const o = r as Record<string, unknown>;
      return {
        label: String(o.label || "line").trim() || "line",
        amount: String(o.amount || "$0").trim() || "$0",
      };
    })
    .filter((x) => x.label);
  const cost_drivers = Array.isArray(raw.cost_drivers)
    ? (raw.cost_drivers as unknown[]).map((s) => String(s).trim()).filter(Boolean)
    : [];
  return {
    line_items: line_items.length ? line_items : [{ label: "Consolidated estimate", amount: String(raw.total_cost || "$0") }],
    total_cost: String(raw.total_cost || "TBD").trim() || "TBD",
    cost_drivers: cost_drivers.length ? cost_drivers : ["materials and consumables drive total"],
  };
}

export async function generateCost(
  openai: OpenAI,
  materials: MaterialItem[],
  log: PipelineLogFn
): Promise<CostEstimate> {
  log("cost_estimation", "start", { materials: materials.length });
  const { user } = buildCostUserMessage(materials);
  const raw = await completeJson(openai, {
    system: COST_SYSTEM,
    user,
    max_tokens: 1000,
  });
  const out = parseCost(raw);
  log("cost_estimation", "complete", { total: out.total_cost });
  return out;
}
