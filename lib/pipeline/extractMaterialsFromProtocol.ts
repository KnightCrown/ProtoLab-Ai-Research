import type OpenAI from "openai";
import {
  buildExtractMaterialsUser,
  EXTRACT_MATERIALS_SYSTEM,
} from "@/lib/prompts/extractMaterialsPrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import type { ExtractedMaterial, PipelineLogFn, ProtocolStep } from "@/lib/pipeline/types";

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
  protocol: ProtocolStep[],
  log: PipelineLogFn
): Promise<ExtractedMaterial[]> {
  log("extract_materials", "start", { steps: protocol.length });
  if (protocol.length === 0) {
    throw new Error("Protocol is empty; cannot extract materials");
  }
  const raw = await completeJson(openai, {
    system: EXTRACT_MATERIALS_SYSTEM,
    user: buildExtractMaterialsUser(protocol),
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
