import type OpenAI from "openai";
import {
  buildExtractMaterialsUser,
  EXTRACT_MATERIALS_SYSTEM,
} from "@/lib/prompts/extractMaterialsPrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import { totalStepCount } from "@/lib/pipeline/protocolFlatten";
import type { ExtractedMaterial, LaboratoryProtocol, PipelineLogFn } from "@/lib/pipeline/types";

function parseList(raw: Record<string, unknown>): ExtractedMaterial[] {
  const arr = raw.materials;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((m) => {
      const o = m as Record<string, unknown>;
      return {
        name: String(o.name || "").trim() || "unnamed",
        specification: String(o.specification || "see protocol").trim() || "see protocol",
      };
    })
    .filter((m) => m.name && m.name !== "unnamed");
}

export async function extractMaterialsFromProtocol(
  openai: OpenAI,
  protocols: LaboratoryProtocol[],
  log: PipelineLogFn
): Promise<ExtractedMaterial[]> {
  const stepCount = totalStepCount(protocols);
  log("extract_materials", "start", { procedures: protocols.length, steps: stepCount });
  if (protocols.length === 0 || stepCount === 0) {
    throw new Error("No protocol procedures; cannot extract materials");
  }
  const raw = await completeJson(openai, {
    system: EXTRACT_MATERIALS_SYSTEM,
    user: buildExtractMaterialsUser(protocols),
    max_tokens: 3500,
  });
  const materials = parseList(raw);
  if (materials.length < 2) {
    throw new Error("Extracted too few materials from protocol");
  }
  const capped = materials.slice(0, 20);
  log("extract_materials", "complete", { count: capped.length });
  return capped;
}
