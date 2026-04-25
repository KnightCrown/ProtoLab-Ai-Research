import type { ExperimentResults } from "./experimentModel";
import type { MaterialRow, TrustIssue } from "./mockData";

const noveltyOptions = [
  "Similar work exists",
  "Limited prior evidence",
  "Novel in this context",
] as const;

const summaries: string[] = [
  "Proposed as a high-throughput phenotyping loop with preregistered endpoints and a matched control group under greenhouse constraints.",
  "Framed to isolate treatment effects with weekly QC checks and a conservative power estimate based on prior variance.",
  "Designed to compare intervention arms using blinded readouts, with a dedicated validation cohort in the final week.",
];

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function generateMockResults({
  name,
  hypothesis,
}: {
  name: string;
  hypothesis: string;
}): ExperimentResults {
  const h = simpleHash(`${name}|${hypothesis}`);

  const c1 = 900 + (h % 200);
  const c2 = 120 + (h % 80);
  const c3 = 300 + (h % 150);
  const materials: MaterialRow[] = [
    { item: "Reagent & Consumables", supplier: "Core Labs", cost: `$${c1}` },
    { item: "Sterile Trays", supplier: "MedSupply", cost: `$${c2}` },
    { item: "Phenotyping Kit", supplier: "BioAnalytix", cost: `$${c3}` },
  ];

  const totalCost = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    c1 + c2 + c3
  );

  const protocolSteps = [
    "Define inclusion criteria and randomize conditions with preregistration in the internal notebook.",
    "Set baseline measurements and run calibration for all instruments and scoring rubrics.",
    "Execute the intervention on treatment arms; maintain blinded readouts for primary endpoints.",
    "Monitor intermediate outcomes, apply stopping rules if safety thresholds are crossed.",
    "Collect final data, run planned analyses, and log deviations with post-hoc review.",
  ];

  if (h % 2 === 0) {
    protocolSteps.push("Replicate a subset in an independent run to de-risk spurious effects.");
  }

  const issues: TrustIssue[] = [
    { text: "Protocol schedule may need buffer for repeat assays", severity: h % 3 === 0 ? "medium" : "low" },
    { text: "Key comparator arm details could be more explicit", severity: h % 2 === 0 ? "high" : "medium" },
    { text: "Data retention policy not specified in this draft", severity: "low" },
  ];

  return {
    overview: {
      noveltyStatus: noveltyOptions[h % noveltyOptions.length],
      summary: `${summaries[h % summaries.length]} Focus: ${hypothesis.slice(0, 160) || "your hypothesis"}.`,
    },
    protocolSteps,
    materials,
    totalCost,
    timeline: [
      "Week 1: Design lock + baseline prep",
      "Week 2–3: Core execution and intermediate reads",
      "Week 4: Final collection + initial analysis",
    ],
    staffing: [
      { role: "Lab Technician", hours: 20 + (h % 20) },
      { role: "Research Scientist", hours: 16 + (h % 12) },
      { role: "Data Analyst", hours: 8 + (h % 8) },
    ],
    trustScore: {
      score: 64 + (h % 32),
      issues,
    },
  };
}
