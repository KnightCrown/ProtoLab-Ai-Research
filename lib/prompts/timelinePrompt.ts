const TIMELINE_MERGE_SCHEMA = `{
  "constraints": string[],
  "protocols": [ { "id": string, "name": string, "duration": string } ],
  "phases": [ { "name": string, "duration": string, "deliverables": string[] } ],
  "total_duration": string,
  "dependencies": string[],
  "steps_timeline": [
    { "step_number": number, "step": string, "estimated_duration": string, "type": "preparation" | "incubation" | "execution" | "measurement" | "analysis" }
  ]
}`;

/** Single, compact JSON object for the Tavily search API. */
export const TIMELINE_QUERY_SYSTEM = `You write one web search query for a real-time research API (Tavily-style).
The query must help find typical **wall-clock duration**, timing, and experimental timelines (hours, days, weeks) for the *class* of work described.
Output JSON only: { "query": string }
Rules:
- 8–20 words, English, no site: operators, no quote characters inside the string.
- Favour: duration, time course, how long, incubation, days, hours, protocol timeline, experimental schedule.
- Do not name specific vendors or catalog numbers.`;

export function buildTimelineQueryUser(
  hypothesis: string,
  protocolSnapshot: { id: string; title: string; digest: string }[]
): string {
  return `HYPOTHESIS (context)
${hypothesis}

PROTOCOLS (use all titles + digests to scope the one search)
${JSON.stringify(protocolSnapshot, null, 2)}

Return a single { "query": "..." } JSON object.`;
}

/**
 * Merged: constraints extraction + per-protocol + experiment phases + small steps_timeline.
 * One call — keeps latency low; large per-step runs are not emitted.
 */
export const TIMELINE_MERGE_SYSTEM = `You are a senior lab operations lead. You receive:
(1) HYPOTHESIS, (2) TAVILY_SEARCH_TEXT — weak prior from the web, may be partial or off-topic, (3) PER_PROTOCOL_STEPS — ground truth about what each SOP does.

Build a **realistic** wall-clock plan. You MUST return JSON only in this schema: ${TIMELINE_MERGE_SCHEMA}

## Ingest TAVILY
- \`constraints\` must be **3–8** short strings you derive by combining the Tavily text with your expertise (e.g. "cell culture often requires 24–72h before assay", "ELISA readout ~half day of hands-on"). If Tavily is thin, state conservative domain norms — never invent false citations, but you may use general knowledge.

## Per-protocol durations
- The \`protocols\` array has **one object per SOP in PER_PROTOCOL_STEPS** with the same \`id\` (copy exactly from input).
- **Do not give every protocol the same \`duration\` unless the step count and work type truly match.** Ruminate on leaf-step content: replicates, incubation, long instrument runs, animal/cell work, and multi-day waits.
- Incubation / growth / in vivo / hybridisation / transfection / bacterial culture: the protocol span covering those steps is **at least 24 hours** in aggregate unless the only incubation is explicitly sub-day (e.g. 1 h at RT) with no other biology.
- Preparation-only / buffer-only protocol: hours to ~1 day.
- Assay / measurement / acquisition-heavy: typically **hours to 1 day** active, but if sandwiched between overnight steps, the protocol’s **own** span is still the full wall wait.
- Do not compress a clearly multi-day workflow into hours.
- \`name\` must be the SOP **title** from the input; use it verbatim (minor punctuation OK).

## Phases
- **Exactly 3** phases, in this order, with these name patterns (exact wording not critical but use these three concepts):
  1. "Preparation"  2. "Experiment Execution"  (or "Experiment")  3. "Analysis"
- Durations: ranges allowed ("2–3 days", "1–2 weeks"). \`total_duration\` = end-to-end project span, conservative; must feel coherent with phases and protocol breakdown (parallelism may shorten calendar time; say so in dependencies if needed).
- \`deliverables\` are 1–3 short bullet phrases per phase.

## steps_timeline (compact, ~4–10 rows)
- **Do not** emit one line per protocol leaf. Instead:
  - For **each** protocol, one row: \`type\` usually \`execution\`, \`step\` = the protocol \`name\` (or one short label), \`estimated_duration\` = that protocol’s **duration string** (same as in \`protocols[]\` for that id), \`step_number\` sequential 1..N
  - You may add up to 2 more rows (e.g. a \`preparation\` and an \`analysis\` row) to reflect cross-cutting prep/analysis not tied to a single SOP, if the hypothesis implies it. Otherwise, protocol-only rows are fine.
- Keep any free-text **short** (no paragraph-long \`step\` fields) so the JSON is complete.

## dependencies
- **2–6** short strings on the critical path (e.g. "reagent qualification before main assay", "cultures must reach confluence before treatment").

## Brevity
- The entire output must be valid JSON, no markdown fences, no text before/after.`;

export function buildTimelineMergeUser(args: {
  hypothesis: string;
  tavilyText: string;
  perProtocol: { id: string; title: string; leafCount: number; stepSummaries: string[] }[];
}): string {
  return `HYPOTHESIS
${args.hypothesis}

TAVILY_SEARCH_TEXT (grounding — use with judgment)
${args.tavilyText || "(empty)"}

PER_PROTOCOL_STEPS (one block per SOP, **ids are authoritative**)
${JSON.stringify(args.perProtocol, null, 2)}

Return the JSON object.`;
}
