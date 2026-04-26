import type OpenAI from "openai";
import {
  buildExtractMaterialsUser,
  EXTRACT_MATERIALS_SYSTEM,
} from "@/lib/prompts/extractMaterialsPrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import { totalStepCount } from "@/lib/pipeline/protocolFlatten";
import type { ExtractedMaterial, LaboratoryProtocol, PipelineLogFn } from "@/lib/pipeline/types";

/**
 * Items that are universally present in any equipped laboratory and should
 * never appear in a scientific proposal's materials list regardless of context.
 * This is a hard backstop in addition to the LLM-level guidance.
 *
 * Patterns are matched case-insensitively against the material name.
 * Avoid over-matching — only include things that are ALWAYS standard.
 */
const STANDARD_EQUIPMENT_PATTERNS: RegExp[] = [
  /\bpipett/i,               // pipette, pipettes, pipettor — all standard
  /\bvortex\b/i,
  /\bmagnetic stir/i,
  /\bstir bar/i,
  /\bstir plate/i,
  /\bhot plate\b/i,
  /\banalytical balance\b/i,
  /\blab(?:oratory)? balance\b/i,
  /\bph meter\b/i,
  /\bwater bath\b/i,          // basic water baths only; context-specifics pass through
  /\bbiosafety cabinet\b/i,
  /\bfume hood\b/i,
  /\bautoclave\b/i,
  /\bbasic (?:optical|brightfield) microscope\b/i,
  /\blab coat\b/i,
  /\bnitrile gloves?\b/i,
  /\blatex gloves?\b/i,
  /\bsafety goggles?\b/i,
  /\bpersonal protective/i,
  /\bppe\b/i,
  /\btimer\b/i,
  /\bscissors\b/i,
  /\bforceps\b/i,
  /\bruler\b/i,
  /\blab tape\b/i,
  /\bpermanent marker\b/i,
  /\bdi water\b/i,
  /\bdistilled water\b/i,
  /\bultrapure water\b/i,
  /\bmilli-?q water\b/i,
];

function isStandardEquipment(name: string): boolean {
  return STANDARD_EQUIPMENT_PATTERNS.some((re) => re.test(name));
}

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

  // Hard-filter standard equipment the LLM may have included despite prompt guidance.
  const filtered = materials.filter((m) => !isStandardEquipment(m.name));
  const excluded = materials.length - filtered.length;
  if (excluded > 0) {
    log("extract_materials", "filtered_standard", { excluded, kept: filtered.length });
  }

  if (filtered.length < 2) {
    throw new Error("Extracted too few materials from protocol after filtering standard equipment");
  }
  const capped = filtered.slice(0, 20);
  log("extract_materials", "complete", { count: capped.length });
  return capped;
}
