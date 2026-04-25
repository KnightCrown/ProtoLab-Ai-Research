import type {
  FlattenedProcedureLine,
  LaboratoryProtocol,
  ProcedureStep,
  ProtocolConditions,
} from "@/lib/pipeline/types";

function condBits(c: ProtocolConditions | undefined): string {
  if (!c) return "";
  return [c.time, c.temperature, c.concentration, c.other].filter((x) => x && String(x).trim()).join(" · ");
}

/** One schedulable line for tooltips, timeline fallbacks, and Tavily queries. */
export function summarizeStep(s: ProcedureStep): string {
  if (s.text?.trim()) return s.text.trim();
  const parts: string[] = [];
  if (s.action?.trim()) parts.push(s.action.trim());
  if (s.inputs?.length) parts.push(`Inputs: ${s.inputs.join("; ")}`);
  if (s.quantities?.trim()) parts.push(s.quantities.trim());
  const cb = condBits(s.conditions);
  if (cb) parts.push(cb);
  if (s.output?.trim()) parts.push(`Out: ${s.output.trim()}`);
  if (s.observation?.trim()) parts.push(`Note: ${s.observation.trim()}`);
  if (s.kind?.trim()) parts.unshift(`[${s.kind}]`);
  if (parts.length) return parts.join(" — ");
  return "Procedure step";
}

function walkLeaves(steps: ProcedureStep[], visit: (s: ProcedureStep) => void): void {
  for (const s of steps) {
    if (s.sub_steps?.length) {
      walkLeaves(s.sub_steps, visit);
    } else {
      visit(s);
    }
  }
}

/** Count leaf steps (each schedulable unit) across all protocols. */
export function countLeafSteps(protocols: LaboratoryProtocol[]): number {
  let n = 0;
  for (const p of protocols) {
    walkLeaves(p.procedure, () => {
      n += 1;
    });
  }
  return n;
}

export function totalStepCount(protocols: LaboratoryProtocol[]): number {
  return countLeafSteps(protocols);
}

/**
 * Depth-first flatten of all leaf steps; renumbers globally 1..N in protocol order.
 */
export function flattenProtocolSteps(protocols: LaboratoryProtocol[]): FlattenedProcedureLine[] {
  const out: FlattenedProcedureLine[] = [];
  let n = 0;
  for (const p of protocols) {
    walkLeaves(p.procedure, (s) => {
      n += 1;
      out.push({ step_number: n, summary: `[${p.title}] ${summarizeStep(s)}` });
    });
  }
  return out;
}
