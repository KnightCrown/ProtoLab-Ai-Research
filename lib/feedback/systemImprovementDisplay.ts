import type { AppliedFeedbackRule } from "@/lib/pipeline/types";

/** When surfacing the card, at most one row per category, prefer this order. */
const CATEGORY_ORDER = [
  "control",
  "protocol",
  "materials",
  "validation",
  "timeline",
  "general",
] as const;

const MAX_CATEGORIES_SHOWN = 4;

function normalizeType(t: string): string {
  return String(t || "general")
    .trim()
    .toLowerCase() || "general";
}

/**
 * Picks at most 4 **distinct categories** (one rule each): walk priority order, then
 * any remaining type first-seen. Never shows two rows for the same `type` — if seven
 * rules are all "general", you get one "general" line and the count badge can still
 * be "4+".
 */
export function pickDiverseSystemImprovements(
  rules: AppliedFeedbackRule[],
  max: number = MAX_CATEGORIES_SHOWN
): AppliedFeedbackRule[] {
  if (rules.length === 0) return [];
  const cap = Math.min(max, MAX_CATEGORIES_SHOWN);
  const byType = new Set<string>();
  const out: AppliedFeedbackRule[] = [];

  const pushIfNewType = (r: AppliedFeedbackRule) => {
    if (out.length >= cap) return;
    const t = normalizeType(r.type);
    if (byType.has(t)) return;
    byType.add(t);
    out.push(r);
  };

  for (const kind of CATEGORY_ORDER) {
    if (out.length >= cap) break;
    const first = rules.find((r) => normalizeType(r.type) === kind);
    if (first) pushIfNewType(first);
  }
  for (const r of rules) {
    if (out.length >= cap) break;
    pushIfNewType(r);
  }
  return out;
}

const DISPLAY_TEMPLATES: Record<string, string> = {
  control:
    "Emphasize explicit control conditions and comparators so the design stays interpretable across different studies, models, and reagent lots.",
  protocol:
    "Write SOPs as unambiguous, executable steps with consistent naming for materials, instruments, and safety-critical actions.",
  materials:
    "Clarify sourcing, grade, and key specifications for reagents, media, and biologicals so work can be repeated without ad hoc substitutions.",
  validation:
    "Spell out how outcomes are measured, validated, and analyzed, including success criteria and statistics when they matter for the design.",
  timeline:
    "Use realistic timelines: allow hands-on work, required waiting or growth periods, and analysis without compressing multi-day work into hours.",
  general:
    "Tighten the plan against recurring gaps in design, methods, and reporting so results stay credible across similar experiments.",
};

/**
 * Card copy only — wide, template-style text so the banner reads like guidance, not
 * a verbatim quote of one past run (e.g. a single strain or SKU).
 */
export function displayTextForSystemImprovement(rule: AppliedFeedbackRule): string {
  const t = normalizeType(rule.type);
  return DISPLAY_TEMPLATES[t] ?? DISPLAY_TEMPLATES.general;
}

/** e.g. "4+" when more than two threshold rules are active in the run; else the exact count. */
export function systemImprovementBadgeCount(total: number, atPlusThreshold: number = MAX_CATEGORIES_SHOWN): string {
  if (total <= 0) return "0";
  return total > atPlusThreshold ? `${atPlusThreshold}+` : String(total);
}

export { MAX_CATEGORIES_SHOWN as MAX_SHOWN };
