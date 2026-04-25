import type { LiteratureReference } from "./analyzeTypes";
import type { MaterialRow, TrustIssue } from "./mockData";
import type { ProtocolStep, ValidationPlan } from "./pipeline/types";

export type HypothesisHighlights = {
  independent: string[];
  dependent: string[];
};

/**
 * UI-facing experiment result (v0.4+ pipeline maps into this shape).
 */
export type ExperimentResults = {
  overview: {
    noveltyStatus: string;
    summary: string;
    references?: LiteratureReference[];
    /** Populated from pipeline hypothesis analysis */
    hypothesisHighlights?: HypothesisHighlights;
  };
  /** Structured protocol when produced by the v0.4 pipeline */
  protocolStructured?: ProtocolStep[];
  /** One-line per step (same protocol, for compact views) */
  protocolSteps: string[];
  materials?: MaterialRow[];
  totalCost?: string;
  costLineItems?: { label: string; amount: string }[];
  costDrivers?: string[];
  timeline?: string[];
  timelineTotalDuration?: string;
  timelineDependencies?: string[];
  validation?: ValidationPlan;
  /** Legacy: staffing grid when present */
  staffing?: { role: string; hours: number }[];
  /** Legacy mock trust score; optional if validation-only mode */
  trustScore?: { score: number; issues: TrustIssue[] };
};

export type Experiment = {
  id: string;
  name: string;
  hypothesis: string;
  results: ExperimentResults | null;
  /** v0.4 full server payload; optional, for power users / future UI */
  fullPlan?: import("./pipeline/types").PipelineResult;
};
