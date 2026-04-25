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
  reasoning?: string;
};

export type ProtocolConditions = {
  time?: string;
  temperature?: string;
  concentration?: string;
  other?: string;
};

/**
 * Flexible procedure step: include only fields that add clarity (real lab protocols mix
 * calculations, prep, execution, and notes). Use `text` for narrative steps; nest `sub_steps`
 * for 1a/1b or grouped operations.
 */
export type ProcedureStep = {
  step_number: number;
  /** e.g. calculation | preparation | execution | measurement | repetition | section | note */
  kind?: string;
  /** Primary narrative for the step when a single block is best */
  text?: string;
  action?: string;
  inputs?: string[];
  quantities?: string;
  conditions?: ProtocolConditions;
  output?: string;
  observation?: string;
  sub_steps?: ProcedureStep[];
};

/** @deprecated alias — same as ProcedureStep */
export type ProtocolStep = ProcedureStep;

/**
 * One executable procedure. Procedure is an ordered list of steps; optional notes block at end.
 */
export type LaboratoryProtocol = {
  /** Stable id for UI keys, e.g. "proc-1" */
  protocol_id: string;
  title: string;
  objective: string;
  /** Reagents, consumables, equipment—specific lines as in a real SOP */
  materials: string[];
  /** Top-level procedure steps; may nest sub_steps for logical grouping */
  procedure: ProcedureStep[];
  /** Optional end section: bench notes, formulas, acceptance criteria, etc. */
  notes_and_calculations?: string[];
};

/** Flattened line for schedulers and timeline fallback (one row per “leaf” step). */
export type FlattenedProcedureLine = {
  step_number: number;
  summary: string;
};

/** Raw extraction from protocol text (stage: extractMaterialsFromProtocol) */
export type ExtractedMaterial = {
  name: string;
  specification: string;
};

/** After Tavily + parsing (stage: researchMaterials) */
export type ResearchedMaterial = {
  name: string;
  product_name: string;
  supplier: string;
  price_estimate: string;
  source_url: string;
  specification: string;
};

export type CostLineItem = {
  label: string;
  amount: string;
};

export type CostEstimate = {
  line_items: CostLineItem[];
  total_cost: string;
  cost_range: { min: string; max: string; note?: string };
  cost_drivers: string[];
};

export type TimelineStepType =
  | "preparation"
  | "incubation"
  | "execution"
  | "measurement"
  | "analysis";

export type StepTimeline = {
  step_number: number;
  step: string;
  estimated_duration: string;
  type: TimelineStepType;
};

export type TimelinePhase = {
  name: string;
  duration: string;
  deliverables: string[];
};

export type TimelinePlan = {
  steps_timeline: StepTimeline[];
  phases: TimelinePhase[];
  total_duration: string;
  dependencies: string[];
  web_duration_note?: string;
};

export type StaffingPlan = {
  roles: string[];
  total_people: number;
  hours_per_role: Record<string, number>;
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
  /** One or more lab-manual–grade procedures */
  protocols: LaboratoryProtocol[];
  materials_extracted: ExtractedMaterial[];
  /** Grounded in Tavily snippets; used for cost */
  materials: ResearchedMaterial[];
  cost_estimate: CostEstimate;
  timeline: TimelinePlan;
  staffing: StaffingPlan;
  validation: ValidationPlan;
};

export type PipelineLogFn = (stage: string, message: string, detail?: unknown) => void;
