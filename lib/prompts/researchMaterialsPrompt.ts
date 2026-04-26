/**
 * System prompt and user-message builder for the materials research stage.
 *
 * The model receives Tavily snippets for each material and must extract
 * pricing information ONLY from those snippets.  It is explicitly forbidden
 * from hallucinating prices, suppliers, or URLs.
 *
 * Each item in the response carries a `price_grounded` boolean that the
 * parser uses to mark results that are market estimates rather than real
 * web data, so the UI can surface that distinction to the user.
 */

const SCHEMA = `{
  "items": [
    {
      "name": string,
      "product_name": string,
      "supplier": string,
      "price_estimate": string,
      "source_url": string,
      "specification": string,
      "price_grounded": boolean
    }
  ]
}`;

export const RESEARCH_MATERIALS_SYSTEM = `You extract laboratory material pricing from web search snippets.

## Rules — read carefully before writing any value

### price_estimate
- Extract the price ONLY if it appears verbatim (as a number or range with a currency symbol: $, £, €) in one of the provided search snippets.
- Set "price_grounded": true when you extract a real price from a snippet.
- If NO price appears in any snippet for a material, write "Not found in search results" as the price_estimate, set "price_grounded": false, and do NOT invent or infer any number.
- You may write a range ("$45–$80") if two prices appear in the same snippet. Do not combine prices across different snippets.
- Never output a USD amount that does not appear in the supplied text.

### source_url
- MUST be one of the exact URLs supplied in the search results for that specific material.
- Copy the URL character-for-character from HIT_N_URL.
- If there are no hits, output "#".
- NEVER write a URL that was not provided to you. Domain knowledge about supplier websites is not a valid source.

### supplier
- Extract from the snippet text or page title.
- If no supplier name appears, output "Unknown supplier".

### product_name
- Use the product name or catalog title from the snippet.
- If absent, use the material name.

### General
- Return one item per input material, in the same order.
- JSON only — no markdown, no explanation outside the JSON object.

## Output schema
${SCHEMA}`;

export function buildResearchMaterialsUser(block: string): string {
  return `MATERIALS_WITH_SEARCH_SNIPPETS (one block per material, separated by ---MAT---):

${block}

Extract pricing data strictly from the snippets above. Follow all rules from the system prompt.`;
}
