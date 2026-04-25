import type { LiteratureReference } from "./analyzeTypes";
import type { ExperimentResults } from "./experimentModel";
import type { MaterialRow } from "./mockData";
import type { PipelineResult } from "./pipeline/types";

function litRefsToOverviewRefs(
  refs: PipelineResult["literature_qc"]["references"]
): LiteratureReference[] {
  return refs.map((r) => ({ title: r.title, url: r.url }));
}

function mapMaterialsForTable(m: PipelineResult["materials"]): MaterialRow[] {
  return m.map((x) => ({
    item: x.name,
    supplier: x.supplier,
    cost: x.price_estimate,
  }));
}

function mapMaterialsDetail(m: PipelineResult["materials"]): ExperimentResults["materialsDetail"] {
  return m.map((x) => ({
    name: x.name,
    productName: x.product_name,
    supplier: x.supplier,
    price: x.price_estimate,
    sourceUrl: x.source_url,
    spec: x.specification,
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
    h.measurement_method ? `**Measurement (primary):** ${h.measurement_method}` : null,
    h.success_criteria ? `**Success criteria:** ${h.success_criteria}` : null,
  ]
    .filter((x) => x && String(x).trim())
    .join("\n\n");

  const t = plan.timeline;
  const staff = plan.staffing;

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
    materials: mapMaterialsForTable(plan.materials),
    materialsDetail: mapMaterialsDetail(plan.materials),
    totalCost: plan.cost_estimate.total_cost,
    costRange: plan.cost_estimate.cost_range,
    costLineItems: plan.cost_estimate.line_items,
    costDrivers: plan.cost_estimate.cost_drivers,
    timeline: t.phases.map(
      (p) => `${p.name} (${p.duration}) — ${p.deliverables.join("; ")}`
    ),
    stepTimelines: t.steps_timeline,
    timelineTotalDuration: t.total_duration,
    timelineDependencies: t.dependencies,
    timelineWebNote: t.web_duration_note,
    validation: plan.validation,
    staffingPlan: staff,
    staffing: Object.entries(staff.hours_per_role).map(([role, hours]) => ({ role, hours })),
  };
}
