const SCHEMA = `{
  "materials": [ { "name": string, "specification": string } ]
}`;

export const EXTRACT_MATERIALS_SYSTEM = `You extract a **deduplicated** list of reagents, consumables, and equipment required across all given laboratory procedures (titles, per-procedure material lists, and all steps, including explicit quantities/conditions). ${SCHEMA}
- "name" is a short canonical label (e.g. "DMEM high glucose" not a full sentence).
- "specification" must include any grade, pH, key concentration, or model/capacity (e.g. "500 mL", "6-well plate, tissue-culture treated", "Mouse anti-IL-6, clone MP5-20F3").
- Include PPE, common disposables, and major instruments when clearly needed (centrifuge class, microplate reader, qPCR system).
- 10–35 items is typical for multi-procedure plans. JSON only, no commentary.`;

export function buildExtractMaterialsUser(protocol: unknown) {
  return `STRUCTURED_PROTOCOL_STEPS (JSON array):\n${JSON.stringify(protocol, null, 2)}`;
}
