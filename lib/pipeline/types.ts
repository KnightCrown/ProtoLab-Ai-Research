export type HypothesisAnalysis = {
  independent_variables: string[];
  dependent_variables: string[];
  control_group: Record<string, unknown>;
  experimental_groups: string[];
  measurement_method: string;
  success_criteria: string;
};

export type LiteratureReference = {
  title: string;
  url: string;
  snippet?: string;
};

export type LiteratureNovelty = "not found" | "similar work exists" | "exact match";

export type LiteratureQC = {
  novelty: LiteratureNovelty;
  references: LiteratureReference[];
  /** Model justification vs search snippets (optional but shown in UI when present) */
  reasoning?: string;
};

export type ProtocolConditions = {
  time?: string;
  temperature?: string;
  concentration?: string;
  other?: string;
};

export type ProtocolStep = {
  step_number: number;
  action: string;
  inputs: string[];
  conditions: ProtocolConditions;
  output: string;
};

export type MaterialItem = {
  name: string;
  supplier: string;
  estimated_cost: string;
  quantity: string;
};

export type CostLineItem = {
  label: string;
  amount: string;
};

export type CostEstimate = {
  line_items: CostLineItem[];
  total_cost: string;
  cost_drivers: string[];
};

export type TimelinePhase = {
  name: string;
  duration: string;
  deliverables: string[];
};

export type TimelinePlan = {
  phases: TimelinePhase[];
  total_duration: string;
  dependencies: string[];
};

export type ValidationPlan = {
  measurement_method: string;
  statistical_test: string;
  success_criteria: string;
  sources_of_error: string[];
};

export type PipelineResult = {
  hypothesis_analysis: HypothesisAnalysis;
  literature_qc: LiteratureQC;
  protocol: ProtocolStep[];
  materials: MaterialItem[];
  cost_estimate: CostEstimate;
  timeline: TimelinePlan;
  validation: ValidationPlan;
};

export type PipelineLogFn = (stage: string, message: string, detail?: unknown) => void;
