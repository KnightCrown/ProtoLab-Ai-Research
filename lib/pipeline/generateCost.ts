import type OpenAI from "openai";
import { buildCostUserMessage, COST_SYSTEM } from "@/lib/prompts/costPrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import type { CostEstimate, PipelineLogFn, ResearchedMaterial } from "@/lib/pipeline/types";

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
  const cr = raw.cost_range;
  let cost_range: CostEstimate["cost_range"] = {
    min: "$0",
    max: "$0",
    note: "not provided",
  };
  if (cr && typeof cr === "object" && !Array.isArray(cr)) {
    const o = cr as Record<string, unknown>;
    cost_range = {
      min: String(o.min || "TBD").trim() || "TBD",
      max: String(o.max || "TBD").trim() || "TBD",
      note: o.note != null ? String(o.note) : undefined,
    };
  }
  return {
    line_items: line_items.length
      ? line_items
      : [{ label: "Consolidated estimate", amount: String(raw.total_cost || "$0") }],
    total_cost: String(raw.total_cost || "TBD").trim() || "TBD",
    cost_range,
    cost_drivers: cost_drivers.length ? cost_drivers : ["materials and consumables"],
  };
}

export async function generateCost(
  openai: OpenAI,
  materials: ResearchedMaterial[],
  log: PipelineLogFn
): Promise<CostEstimate> {
  log("cost_estimation", "start", { materials: materials.length });
  const raw = await completeJson(openai, {
    system: COST_SYSTEM,
    user: buildCostUserMessage(materials),
    max_tokens: 1200,
  });
  const out = parseCost(raw);
  log("cost_estimation", "complete", { total: out.total_cost });
  return out;
}
