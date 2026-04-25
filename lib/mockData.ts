export type TabId =
  | "overview"
  | "protocol"
  | "materials"
  | "timeline"
  | "trust";

export type NavItem = {
  id: TabId;
  label: string;
};

export type MaterialRow = {
  item: string;
  supplier: string;
  cost: string;
};

export type TrustIssue = {
  text: string;
  severity: "low" | "medium" | "high";
};

export const navItems: NavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "protocol", label: "Protocol" },
  { id: "materials", label: "Materials & Cost" },
  { id: "timeline", label: "Timeline & Staffing" },
  { id: "trust", label: "Trust Score" },
];

export const overviewData = {
  noveltyStatus: "Similar work exists",
  summary:
    "This study explores CRISPR-based optimization for drought tolerance in tomato seedlings using controlled greenhouse conditions and standardized phenotyping metrics.",
};

export const protocolSteps: string[] = [
  "Prepare 120 healthy tomato seedlings and randomize into control and edited groups.",
  "Apply CRISPR-Cas9 guide set targeting drought-response genes in the treatment group.",
  "Acclimate all plants for 72 hours at 24°C with a 16h light / 8h dark cycle.",
  "Initiate drought stress by reducing irrigation to 40% of baseline for 14 days.",
  "Collect phenotype data daily including leaf turgor, chlorophyll index, and biomass.",
  "Run comparative statistical analysis and validate gene edits with PCR confirmation.",
];

export const materials: MaterialRow[] = [
  { item: "CRISPR-Cas9 Reagent Kit", supplier: "GenEdit Labs", cost: "$1,250" },
  { item: "Seedling Growth Trays", supplier: "BioSupply Co.", cost: "$180" },
  { item: "PCR Consumables Set", supplier: "Thermo Scientific", cost: "$420" },
  { item: "Soil Moisture Sensors", supplier: "AgriSense", cost: "$330" },
];

export const totalCost = "$2,180";

export const timeline = [
  "Week 1: Preparation and reagent setup",
  "Week 2-4: Greenhouse experiment execution",
  "Week 5: Analysis and validation",
];

export const staffing = [
  { role: "Lab Technician", hours: 32 },
  { role: "Research Scientist", hours: 28 },
  { role: "Data Analyst", hours: 16 },
];

export const trustScore = {
  score: 78,
  issues: [
    { text: "Timeline too short for replication", severity: "medium" },
    { text: "Missing explicit control group variance target", severity: "high" },
    { text: "Budget buffer for failed assays is limited", severity: "low" },
  ] as TrustIssue[],
};
