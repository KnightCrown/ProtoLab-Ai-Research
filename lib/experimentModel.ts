import type { MaterialRow, TrustIssue } from "./mockData";

/**
 * Per-experiment plan output. Populated when the user clicks
 * "Generate Experiment Plan" (UI-only, mock data).
 */
export type ExperimentResults = {
  overview: { noveltyStatus: string; summary: string };
  protocolSteps: string[];
  materials: MaterialRow[];
  totalCost: string;
  timeline: string[];
  staffing: { role: string; hours: number }[];
  trustScore: { score: number; issues: TrustIssue[] };
};

export type Experiment = {
  id: string;
  name: string;
  hypothesis: string;
  results: ExperimentResults | null;
};
