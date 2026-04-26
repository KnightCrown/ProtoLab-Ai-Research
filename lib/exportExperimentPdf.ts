import { jsPDF } from "jspdf";
import {
  displayTextForSystemImprovement,
  pickDiverseSystemImprovements,
  MAX_SHOWN,
} from "@/lib/feedback/systemImprovementDisplay";
import type { ExperimentResults } from "@/lib/experimentModel";
import { procedureStepToNarrative } from "@/lib/procedureNarrative";
import type { ProcedureStep } from "@/lib/pipeline/types";

const BOTTOM = 280;

function asciiForPdf(s: string): string {
  return s
    .replace(/\u00a0/g, " ")
    .replace(/[μµ]/g, "u")
    .replace(/×/g, "x")
    .replace(/°/g, " deg")
    .replace(/[–—]/g, "-");
}

class PdfOut {
  doc: jsPDF;
  y: number;
  margin = 14;
  line = 5.2;
  bodySize = 10;
  w: number;
  maxW: number;
  pageBottom = BOTTOM;

  constructor() {
    this.doc = new jsPDF({ format: "a4", unit: "mm" });
    this.y = 18;
    this.w = this.doc.internal.pageSize.getWidth();
    this.maxW = this.w - 2 * this.margin;
  }

  newPage() {
    this.doc.addPage();
    this.y = 18;
  }

  need(h: number) {
    if (this.y + h > this.pageBottom) this.newPage();
  }

  h1(s: string) {
    s = asciiForPdf(s);
    this.need(12);
    this.doc.setFontSize(13);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(s, this.margin, this.y);
    this.y += 9;
    this.doc.setFontSize(this.bodySize);
    this.doc.setFont("helvetica", "normal");
  }

  h2(s: string) {
    s = asciiForPdf(s);
    this.need(9);
    this.doc.setFontSize(11);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(s, this.margin, this.y);
    this.y += 7.5;
    this.doc.setFontSize(this.bodySize);
    this.doc.setFont("helvetica", "normal");
  }

  p(s: string) {
    s = asciiForPdf(s);
    if (!s.trim()) return;
    const lines = this.doc.splitTextToSize(s, this.maxW);
    for (const line of lines) {
      this.need(this.line);
      this.doc.text(line, this.margin, this.y);
      this.y += this.line;
    }
    this.y += 1.5;
  }
}

function walkLeafSteps(
  steps: ProcedureStep[] | undefined,
  emit: (s: string) => void
): void {
  if (!steps) return;
  for (const s of steps) {
    if (s.sub_steps?.length) {
      walkLeafSteps(s.sub_steps, emit);
    } else {
      const n = procedureStepToNarrative(s);
      if (n && n.trim() && n !== "—") {
        emit(`${s.step_number}. ${n}`);
      }
    }
  }
}

/**
 * Exports a multi-section experiment plan as a downloadable PDF (client-only).
 */
export function exportExperimentToPdf(experiment: {
  name: string;
  hypothesis: string;
  results: ExperimentResults | null;
}): void {
  const { name, hypothesis, results } = experiment;
  if (!results) {
    return;
  }

  const o = new PdfOut();
  const r = results;
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  o.h1("ProtoLab AI - Experiment report");
  o.p(`${asciiForPdf(name)}  -  ${date}`);
  o.h2("Hypothesis");
  o.p(hypothesis || "(not provided)");

  const om = r.overview;
  o.h2("Literature & design overview");
  o.p(`Novelty: ${om.noveltyLabel}`);
  o.p(om.literatureInsight);
  o.p("--- Experiment design ---");
  const d = om.experimentDesign;
  o.p(`Control: ${d.controlGroup}`);
  o.p(
    `Variables (indep.): ${d.independentVariables.length ? d.independentVariables.join("; ") : "—"}`
  );
  o.p(
    `Variables (dep.): ${d.dependentVariables.length ? d.dependentVariables.join("; ") : "—"}`
  );
  o.p(`Groups: ${d.experimentalGroups.length ? d.experimentalGroups.join("; ") : "—"}`);
  o.p(`Measurement: ${d.measurementMethod}`);
  o.p(`Success: ${d.successCriteria}`);

  if (om.references?.length) {
    o.h2("References");
    om.references.forEach((ref) => o.p(`- ${ref.title}  ${ref.url}`));
  }

  if (r.appliedRules?.length) {
    o.h2("System improvements applied (summary)");
    o.p(
      r.appliedRules.length > MAX_SHOWN
        ? `${r.appliedRules.length} rules active; up to ${MAX_SHOWN} categories below.`
        : `${r.appliedRules.length} focus area(s).`
    );
    for (const rule of pickDiverseSystemImprovements(r.appliedRules, MAX_SHOWN)) {
      o.p(
        `${rule.type.toUpperCase()}: ${displayTextForSystemImprovement(rule)}`
      );
    }
  }

  if (r.protocolPlan?.length) {
    o.h2("Protocol plan");
    r.protocolPlan.forEach((p, i) => {
      o.p(`${i + 1}. ${p.name}  -  ${p.description || "—"}`);
    });
  }

  if (r.laboratoryProtocols?.length) {
    o.h2("Protocols (detail)");
    for (const p of r.laboratoryProtocols) {
      o.doc.setFont("helvetica", "bold");
      o.p(p.title);
      o.doc.setFont("helvetica", "normal");
      o.p(p.objective || "");
      if (p.materials.length) o.p("Materials: " + p.materials.join("; "));
      const lines: string[] = [];
      walkLeafSteps(p.procedure, (L) => lines.push(L));
      o.p("Procedure:");
      for (const L of lines) o.p(L);
      o.p(" ");
    }
  } else if (r.protocolSteps.length) {
    o.h2("Protocol steps (flat)");
    for (const s of r.protocolSteps) o.p(`- ${s}`);
  }

  if (r.materials?.length) {
    o.h2("Materials (summary)");
    for (const m of r.materials) {
      o.p(`${m.item}  -  ${m.supplier}  -  ${m.cost}`);
    }
  }

  if (r.materialsDetail?.length) {
    o.h2("Sourcing");
    for (const m of r.materialsDetail) {
      o.p(
        `${m.productName || m.name}  |  ${m.supplier}  |  ${m.price}  |  ${m.sourceUrl || "no link"}`
      );
    }
  }

  if (r.totalCost) {
    o.h2("Cost");
    o.p(`Est. total: ${r.totalCost}`);
    if (r.costRange) {
      o.p(
        `Range: ${r.costRange.min} - ${r.costRange.max}${r.costRange.note ? `  (${r.costRange.note})` : ""}`
      );
    }
    if (r.costLineItems?.length) {
      for (const li of r.costLineItems) o.p(`  ${li.label}:  ${li.amount}`);
    }
  }

  if (r.timelinePhases?.length) {
    o.h2("Timeline");
    if (r.timelineTotalDuration) o.p(`Total: ${r.timelineTotalDuration}`);
    for (const ph of r.timelinePhases) {
      o.p(
        `${ph.name} (${ph.duration}):  ${ph.deliverables.join("; ")}`
      );
    }
    if (r.protocolDurations?.length) {
      o.p("Per-protocol span:");
      for (const pr of r.protocolDurations) o.p(`  ${pr.name}: ${pr.duration}`);
    }
    if (r.timelineDependencies?.length) o.p("Dependencies: " + r.timelineDependencies.join("; "));
  }

  if (r.validation) {
    o.h2("Validation");
    o.p(r.validation.measurement_method);
    o.p(`Statistical test: ${r.validation.statistical_test}`);
    o.p(`Success: ${r.validation.success_criteria}`);
    if (r.validation.sources_of_error.length)
      o.p("Error sources: " + r.validation.sources_of_error.join("; "));
  }

  if (r.staffing?.length) {
    o.h2("Staffing (est.)");
    for (const s of r.staffing) o.p(`  ${s.role}:  ${s.hours} h`);
  }

  if (r.trustScore) {
    o.h2("Trust score");
    o.p(
      `Score: ${r.trustScore.score}/100  (${r.trustScore.confidence} confidence)`
    );
    if (r.trustScore.issues.length) {
      o.p("Issues:");
      for (const issue of r.trustScore.issues) o.p(`- ${issue}`);
    }
  }

  const safe = name
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60) || "experiment";
  o.doc.save(`ProtoLab-report-${safe}.pdf`);
}
