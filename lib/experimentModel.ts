import type { LiteratureReference } from "./analyzeTypes";
import type { MaterialRow, TrustIssue } from "./mockData";
import type { ProtocolStep, StaffingPlan, StepTimeline, ValidationPlan } from "./pipeline/types";

export type HypothesisHighlights = {
  independent: string[];
  dependent: string[];
};

export type MaterialDetailRow = {
  name: string;
  productName: string;
  supplier: string;
  price: string;
  sourceUrl: string;
  spec: string;
};

/**
 * UI-facing experiment result (pipeline maps into this shape).
 */
export type ExperimentResults = {
  overview: {
    noveltyStatus: string;
    summary: string;
    references?: LiteratureReference[];
    hypothesisHighlights?: HypothesisHighlights;
  };
  protocolStructured?: ProtocolStep[];
  protocolSteps: string[];
  materials?: MaterialRow[];
  materialsDetail?: MaterialDetailRow[];
  totalCost?: string;
  costRange?: { min: string; max: string; note?: string };
  costLineItems?: { label: string; amount: string }[];
  costDrivers?: string[];
  timeline?: string[];
  stepTimelines?: StepTimeline[];
  timelineTotalDuration?: string;
  timelineDependencies?: string[];
  timelineWebNote?: string;
  validation?: ValidationPlan;
  staffing?: { role: string; hours: number }[];
  staffingPlan?: StaffingPlan;
  trustScore?: { score: number; issues: TrustIssue[] };
};

export type Experiment = {
  id: string;
  name: string;
  hypothesis: string;
  results: ExperimentResults | null;
  fullPlan?: import("./pipeline/types").PipelineResult;
};
