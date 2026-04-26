import type OpenAI from "openai";
import {
  buildResearchMaterialsUser,
  RESEARCH_MATERIALS_SYSTEM,
} from "@/lib/prompts/researchMaterialsPrompt";
import { completeJson } from "@/lib/pipeline/openaiJson";
import { runTavilySearch } from "@/lib/pipeline/tavilySearch";
import type { ExtractedMaterial, PipelineLogFn, ResearchedMaterial } from "@/lib/pipeline/types";

const MAX_MATERIALS = 8;

/** 3 results per material gives the model more price/supplier data to work with. */
const TAVILY_MAX_RESULTS = 3;

function buildQuery(m: ExtractedMaterial): string {
  return `buy ${m.name} ${m.specification} lab price USD supplier`.replace(/\s+/g, " ").trim();
}

type TavilyHit = { title: string; url: string; content: string };

type MaterialPair = {
  material: ExtractedMaterial;
  hits: TavilyHit[];
  /** All URLs returned by Tavily for this material — used to enforce URL grounding. */
  validUrls: Set<string>;
};

function buildSnippetsBlock(pairs: MaterialPair[]): string {
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
          `  HIT_${i + 1}_SNIPPET: ${(h.content || "").slice(0, 700)}`,
        ]),
      ];
      if (hits.length === 0) {
        lines.push("  (no search results found for this material)");
      }
      return lines.join("\n");
    })
    .join("\n---MAT---\n");
}

/**
 * Ensure the source_url the model returned is one of the URLs actually
 * retrieved from Tavily for this material.  If not, fall back to the first
 * Tavily URL, or "#" when there were no results.
 *
 * This is the main anti-hallucination guard for links: the model cannot
 * fabricate a domain it knows from training data.
 */
function enforceUrl(modelUrl: string, validUrls: Set<string>, firstHitUrl: string): string {
  if (modelUrl && modelUrl !== "#" && validUrls.has(modelUrl)) {
    return modelUrl;
  }
  return firstHitUrl || "#";
}

function parseResearched(
  raw: Record<string, unknown>,
  pairs: MaterialPair[]
): ResearchedMaterial[] {
  const arr = raw.items;
  if (!Array.isArray(arr)) return [];

  return arr.map((row, i) => {
    const o = row as Record<string, unknown>;
    const pair = pairs[i];
    const fb = pair?.material ?? pairs[0]!.material;
    const firstHitUrl = pair?.hits[0]?.url ?? "#";

    const rawUrl = String(o.source_url || "#").trim();
    // Hard-enforce: replace any URL not in the Tavily result set for this material.
    const source_url = enforceUrl(rawUrl, pair?.validUrls ?? new Set(), firstHitUrl);

    // price_grounded: respect what the model said, but clamp to false if the
    // price string looks like "Not found" or is empty.
    const rawPrice = String(o.price_estimate || "").trim();
    const modelGrounded = Boolean(o.price_grounded);
    const price_grounded =
      modelGrounded &&
      rawPrice.length > 0 &&
      !rawPrice.toLowerCase().includes("not found") &&
      !rawPrice.toLowerCase().includes("tbd");

    return {
      name: String(o.name || fb.name).trim() || fb.name,
      product_name: String(o.product_name || fb.name).trim() || fb.name,
      supplier: String(o.supplier || "Unknown supplier").trim() || "Unknown supplier",
      price_estimate: rawPrice || "Not found in search results",
      source_url,
      specification: String(o.specification || fb.specification).trim() || fb.specification,
      price_grounded,
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

  // All Tavily calls are independent — fire them all at once.
  const pairs: MaterialPair[] = await Promise.all(
    capped.map(async (material) => {
      const hits = await runTavilySearch({
        tavilyKey,
        query: buildQuery(material),
        maxResults: TAVILY_MAX_RESULTS,
      });
      return {
        material,
        hits,
        // Pre-build the valid-URL set so URL enforcement is O(1) per item.
        validUrls: new Set(hits.map((h) => h.url).filter(Boolean)),
      };
    })
  );

  const block = buildSnippetsBlock(pairs);
  const raw = await completeJson(openai, {
    system: RESEARCH_MATERIALS_SYSTEM,
    user: buildResearchMaterialsUser(block),
    max_tokens: 4000,
  });

  let out = parseResearched(raw, pairs);

  // Length mismatch fallback: fill missing rows with safe defaults.
  if (out.length !== capped.length) {
    out = capped.map((m, i) => {
      const o = out[i];
      if (o) return o;
      return {
        name: m.name,
        product_name: m.name,
        supplier: "Unknown supplier",
        price_estimate: "Not found in search results",
        source_url: pairs[i]?.hits[0]?.url || "#",
        specification: m.specification,
        price_grounded: false,
      };
    });
  }

  const grounded = out.filter((r) => r.price_grounded).length;
  log("research_materials", "complete", {
    researched: out.length,
    tavily_calls: pairs.length,
    prices_grounded: grounded,
    prices_estimated: out.length - grounded,
  });
  return out;
}
