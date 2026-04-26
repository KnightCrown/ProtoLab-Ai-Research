import type { FeedbackRule, FeedbackRuleType } from "./types";

/**
 * Keyword-based rule extraction (no LLM call) — fast, deterministic, free.
 * Each issue string from a trust score run is matched against these patterns
 * and converted into a generalised corrective directive.
 *
 * The mapping is intentionally coarse: the goal is to surface a small,
 * stable set of recurring corrective rules, not to perfectly classify every
 * issue. Issues that match no pattern fall through to the "general" type
 * with the original issue text as the fix.
 */

type Mapping = {
  pattern: RegExp;
  type: FeedbackRuleType;
  fix: string;
};

const MAPPINGS: Mapping[] = [
  {
    pattern: /\bcontrol\b/i,
    type: "control",
    fix: "Always include an explicit, clearly-defined control group in the experimental design.",
  },
  {
    pattern: /\btimeline\b|\bduration\b|\bunrealistic\b|\btoo short\b|\btoo long\b/i,
    type: "timeline",
    fix: "Use realistic timeline durations grounded in real laboratory procedure times.",
  },
  {
    pattern: /\bvalidation\b|\bstatistical\b|\bsignificance\b/i,
    type: "validation",
    fix: "Always specify a validation method and an appropriate statistical test for the design.",
  },
  {
    pattern: /\bmaterial(s)?\b|\breagent(s)?\b|\bsupplier\b/i,
    type: "materials",
    fix: "List all required materials with concentrations, quantities, and supplier-relevant specifications.",
  },
  {
    pattern: /\bprotocol(s)?\b|\bstep(s)?\b|\bprocedure\b|\bsop\b/i,
    type: "protocol",
    fix: "Ensure every protocol contains substantive, executable, methods-grade steps.",
  },
];

/** Convert a list of trust-score issues into a list of feedback rules. */
export function extractRulesFromIssues(issues: string[]): FeedbackRule[] {
  const out: FeedbackRule[] = [];
  for (const raw of issues) {
    const issue = raw.trim();
    if (!issue) continue;

    const mapping = MAPPINGS.find((m) => m.pattern.test(issue));
    out.push({
      type: mapping?.type ?? "general",
      issue,
      fix: mapping?.fix ?? `Address recurring weakness: ${issue}`,
      count: 1,
      lastSeen: new Date().toISOString(),
    });
  }
  return out;
}
