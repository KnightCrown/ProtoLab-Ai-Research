import type { LiteratureReference } from "./analyzeTypes";
import type { ExperimentResults, NoveltyKind } from "./experimentModel";
import type { MaterialRow } from "./mockData";
import { flattenProtocolSteps } from "./pipeline/protocolFlatten";
import type { LiteratureNovelty, PipelineResult } from "./pipeline/types";

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
    priceGrounded: x.price_grounded,
  }));
}

function formatControlGroup(c: Record<string, unknown>): string {
  const keys = Object.keys(c);
  if (keys.length === 0) return "—";
  return keys
    .map((k) => {
      const v = c[k];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return `${k}: ${JSON.stringify(v)}`;
      }
      return `${k}: ${String(v)}`;
    })
    .join("; ");
}

function noveltyFromLiterature(n: LiteratureNovelty): { label: string; kind: NoveltyKind } {
  if (n === "not found") {
    return { label: "No prior work found", kind: "no_prior" };
  }
  if (n === "similar work exists") {
    return { label: "Similar work exists", kind: "similar" };
  }
  return { label: "Well studied", kind: "well_studied" };
}

/** One line per leaf step, in depth-first order (for export / plain fallback). */
function allProtocolLines(protocols: PipelineResult["protocols"]): string[] {
  return flattenProtocolSteps(protocols).map((l) => l.summary);
}

export function mapPlanToResults(plan: PipelineResult): ExperimentResults {
  const h = plan.hypothesis_analysis;
  const l = plan.literature_qc;
  const refList = litRefsToOverviewRefs(l.references);
  const novel = noveltyFromLiterature(l.novelty);
  const insight = (l.reasoning && l.reasoning.trim()) || "—";

  const t = plan.timeline;
  const staff = plan.staffing;

  return {
    overview: {
      noveltyLabel: novel.label,
      noveltyKind: novel.kind,
      literatureInsight: insight,
      experimentDesign: {
        independentVariables: h.independent_variables,
        dependentVariables: h.dependent_variables,
        controlGroup: formatControlGroup(h.control_group),
        experimentalGroups: h.experimental_groups,
        measurementMethod: h.measurement_method,
        successCriteria: h.success_criteria,
      },
      references: refList.length ? refList : undefined,
    },
    protocolPlan: plan.protocol_plan,
    laboratoryProtocols: plan.protocols,
    protocolSteps: allProtocolLines(plan.protocols),
    materials: mapMaterialsForTable(plan.materials),
    materialsDetail: mapMaterialsDetail(plan.materials),
    totalCost: plan.cost_estimate.total_cost,
    costRange: plan.cost_estimate.cost_range,
    costLineItems: plan.cost_estimate.line_items,
    costDrivers: plan.cost_estimate.cost_drivers,
    timeline: t.phases.map(
      (p) => `${p.name} (${p.duration}) — ${p.deliverables.join("; ")}`
    ),
    timelinePhases: t.phases.map((p) => ({
      name: p.name,
      duration: p.duration,
      deliverables: p.deliverables,
    })),
    stepTimelines: t.steps_timeline,
    timelineTotalDuration: t.total_duration,
    timelineDependencies: t.dependencies,
    timelineWebNote: t.web_duration_note,
    validation: plan.validation,
    trustScore: plan.trust_score,
    staffingPlan: staff,
    staffing: Object.entries(staff.hours_per_role).map(([role, hours]) => ({ role, hours })),
  };
}
