import type { LiteratureReference } from "./analyzeTypes";
import type { ExperimentResults } from "./experimentModel";
import type { MaterialRow } from "./mockData";
import type { PipelineResult } from "./pipeline/types";

function litRefsToOverviewRefs(
  refs: PipelineResult["literature_qc"]["references"]
): LiteratureReference[] {
  return refs.map((r) => ({ title: r.title, url: r.url }));
}

function mapMaterials(m: PipelineResult["materials"]): MaterialRow[] {
  return m.map((x) => ({
    item: `${x.name} (${x.quantity})`,
    supplier: x.supplier,
    cost: x.estimated_cost,
  }));
}

function formatProtocolStepLine(s: PipelineResult["protocol"][number]): string {
  const c = s.conditions;
  const condBits = [c?.time, c?.temperature, c?.concentration, c?.other]
    .filter((x) => x && String(x).trim())
    .join(" · ");
  return `${s.action} | in: ${s.inputs.join(", ")} | conditions: ${condBits} | out: ${s.output}`;
}

export function mapPlanToResults(plan: PipelineResult): ExperimentResults {
  const h = plan.hypothesis_analysis;
  const l = plan.literature_qc;
  const refList = litRefsToOverviewRefs(l.references);
  const summary = [
    l.reasoning,
    h.measurement_method
      ? `**Measurement (primary):** ${h.measurement_method}`
      : null,
    h.success_criteria
      ? `**Success criteria:** ${h.success_criteria}`
      : null,
  ]
    .filter((x) => x && String(x).trim())
    .join("\n\n");

  return {
    overview: {
      noveltyStatus: l.novelty,
      summary: summary || "—",
      references: refList.length ? refList : undefined,
      hypothesisHighlights: {
        independent: h.independent_variables,
        dependent: h.dependent_variables,
      },
    },
    protocolStructured: plan.protocol,
    protocolSteps: plan.protocol.map(formatProtocolStepLine),
    materials: mapMaterials(plan.materials),
    totalCost: plan.cost_estimate.total_cost,
    costLineItems: plan.cost_estimate.line_items,
    costDrivers: plan.cost_estimate.cost_drivers,
    timeline: plan.timeline.phases.map(
      (p) => `${p.name} (${p.duration}) — ${p.deliverables.join("; ")}`
    ),
    timelineTotalDuration: plan.timeline.total_duration,
    timelineDependencies: plan.timeline.dependencies,
    validation: plan.validation,
  };
}
