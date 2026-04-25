import type { LiteratureReference } from "./analyzeTypes";
import type { MaterialRow, TrustIssue } from "./mockData";

/**
 * Per-experiment plan output, populated from /api/analyze (v0.3+).
 * Materials / timeline / staffing / trust are optional in v0.3 (not generated server-side).
 */
export type ExperimentResults = {
  overview: {
    noveltyStatus: string;
    summary: string;
    references?: LiteratureReference[];
  };
  protocolSteps: string[];
  materials?: MaterialRow[];
  totalCost?: string;
  timeline?: string[];
  staffing?: { role: string; hours: number }[];
  trustScore?: { score: number; issues: TrustIssue[] };
};

export type Experiment = {
  id: string;
  name: string;
  hypothesis: string;
  results: ExperimentResults | null;
};
