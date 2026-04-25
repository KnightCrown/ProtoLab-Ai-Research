import type OpenAI from "openai";
import { buildMaterialsUserMessage, MATERIALS_SYSTEM } from "@/lib/prompts/materialsPrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import type { HypothesisAnalysis, MaterialItem, PipelineLogFn, ProtocolStep } from "@/lib/pipeline/types";

function parseMaterials(raw: Record<string, unknown>): MaterialItem[] {
  const arr = raw.materials;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((m) => {
      const o = m as Record<string, unknown>;
      return {
        name: String(o.name || "item").trim() || "item",
        supplier: String(o.supplier || "TBD").trim() || "TBD",
        estimated_cost: String(o.estimated_cost || "$0").trim() || "$0",
        quantity: String(o.quantity || "1").trim() || "1",
      };
    })
    .filter((m) => m.name);
}

export async function generateMaterials(
  openai: OpenAI,
  hypothesis: string,
  analysis: HypothesisAnalysis,
  protocol: ProtocolStep[],
  log: PipelineLogFn
): Promise<MaterialItem[]> {
  log("materials_generation", "start", {});
  const raw = await completeJson(openai, {
    system: MATERIALS_SYSTEM,
    user: buildMaterialsUserMessage(hypothesis, analysis, protocol),
    max_tokens: 2500,
  });
  const materials = parseMaterials(raw);
  if (materials.length < 3) {
    throw new Error("Materials list too short for a runnable plan");
  }
  log("materials_generation", "complete", { count: materials.length });
  return materials;
}
