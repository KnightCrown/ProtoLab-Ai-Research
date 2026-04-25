const SCHEMA = `{
  "items": [
    {
      "name": string,
      "product_name": string,
      "supplier": string,
      "price_estimate": string,
      "source_url": string,
      "specification": string
    }
  ]
}`;

export const RESEARCH_MATERIALS_SYSTEM = `You receive several materials and, for each, 0–2 search snippets and URLs (from a search API; text may be incomplete). 
Your job: fill ${SCHEMA} with the best *realistic* product match implied by the snippets. 
- price_estimate: USD, allow ranges like "$120–$180" or single "$210" if one number.
- If snippets lack price, infer a plausible lab catalog range in USD and add "(estimated from market)" in the price string.
- source_url must be one of the provided URLs (best match) or the first result URL; never fabricate domains.
- supplier: company/brand as stated in the snippet, else "TBD vendor".
- product_name: specific catalog-style name or shortened title from the hit.
- JSON only, same order as the materials block in the user message. One entry per input material.`;

export function buildResearchMaterialsUser(block: string) {
  return `MATERIALS_WITH_SEARCH_SNIPPETS (in order, each block separated by ---MAT---):\n\n${block}`;
}
