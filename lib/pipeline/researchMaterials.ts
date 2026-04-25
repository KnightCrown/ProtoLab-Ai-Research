import type OpenAI from "openai";
import {
  buildResearchMaterialsUser,
  RESEARCH_MATERIALS_SYSTEM,
} from "@/lib/prompts/researchMaterialsPrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import { runTavilySearch } from "@/lib/pipeline/tavilySearch";
import type { ExtractedMaterial, PipelineLogFn, ResearchedMaterial } from "@/lib/pipeline/types";

const MAX_MATERIALS = 8;

function buildQuery(m: ExtractedMaterial): string {
  return `${m.name} ${m.specification} lab price supplier catalog`.replace(/\s+/g, " ").trim();
}

function buildSnippetsBlock(
  pairs: { material: ExtractedMaterial; hits: { title: string; url: string; content: string }[] }[]
): string {
  return pairs
    .map(({ material, hits }, idx) => {
      const lines = [
        `INDEX: ${idx + 1}`,
        `NAME: ${material.name}`,
        `SPECIFICATION: ${material.specification}`,
        `SEARCH_HITS:`,
        ...hits.flatMap((h, i) => [
          `  HIT_${i + 1}_URL: ${h.url}`,
          `  HIT_${i + 1}_TITLE: ${h.title}`,
          `  HIT_${i + 1}_SNIPPET: ${(h.content || "").slice(0, 600)}`,
        ]),
      ];
      return lines.join("\n");
    })
    .join("\n---MAT---\n");
}

function parseResearched(raw: Record<string, unknown>, fallbacks: ExtractedMaterial[]): ResearchedMaterial[] {
  const arr = raw.items;
  if (!Array.isArray(arr)) return [];
  return arr.map((row, i) => {
    const o = row as Record<string, unknown>;
    const fb = fallbacks[i] || fallbacks[0]!;
    return {
      name: String(o.name || fb.name).trim() || fb.name,
      product_name: String(o.product_name || fb.name).trim() || fb.name,
      supplier: String(o.supplier || "TBD").trim() || "TBD",
      price_estimate: String(o.price_estimate || "TBD").trim() || "TBD",
      source_url: String(o.source_url || "#").trim() || "#",
      specification: String(o.specification || fb.specification).trim() || fb.specification,
    };
  });
}

export async function researchMaterials(
  openai: OpenAI,
  tavilyKey: string,
  extracted: ExtractedMaterial[],
  log: PipelineLogFn
): Promise<ResearchedMaterial[]> {
  log("research_materials", "start", { extracted: extracted.length });
  const capped = extracted.slice(0, MAX_MATERIALS);

  const pairs: { material: ExtractedMaterial; hits: { title: string; url: string; content: string }[] }[] =
    [];

  for (let i = 0; i < capped.length; i += 3) {
    const chunk = capped.slice(i, i + 3);
    const chunkResults = await Promise.all(
      chunk.map(async (material) => {
        const hits = await runTavilySearch({
          tavilyKey,
          query: buildQuery(material),
          maxResults: 2,
        });
        return { material, hits };
      })
    );
    pairs.push(...chunkResults);
  }

  const block = buildSnippetsBlock(pairs);
  const raw = await completeJson(openai, {
    system: RESEARCH_MATERIALS_SYSTEM,
    user: buildResearchMaterialsUser(block),
    max_tokens: 4000,
  });
  let out = parseResearched(raw, capped);
  if (out.length !== capped.length) {
    out = capped.map((m, i) => {
      const o = out[i];
      if (o) return o;
      return {
        name: m.name,
        product_name: m.name,
        supplier: "TBD (no parse)",
        price_estimate: "TBD",
        source_url: pairs[i]?.hits[0]?.url || "#",
        specification: m.specification,
      };
    });
  }
  log("research_materials", "complete", { researched: out.length, tavily_calls: pairs.length });
  return out;
}
