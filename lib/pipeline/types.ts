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

/** Planner output: distinct procedures to generate in order. */
export type ProtocolPlanItem = {
  id: string;
  name: string;
  description: string;
};

/**
 * One full executable SOP, generated in isolation for one plan item.
 */
export type LaboratoryProtocol = {
  /** Matches ProtocolPlanItem.id */
  id: string;
  title: string;
  objective: string;
  materials: string[];
  procedure: ProcedureStep[];
  /** Formulas, acceptance, logbook — concise only */
  notes?: string[];
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
  /**
   * URL from one of the Tavily search hits for this material.
   * Always a real URL returned by Tavily — never model-generated.
   */
  source_url: string;
  specification: string;
  /**
   * True  → price was extracted from a Tavily search snippet (real web data).
   * False → no price was found in the snippets; value is a market estimate.
   */
  price_grounded: boolean;
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
  /** LLM: ordered list of required procedures (planning stage) */
  protocol_plan: ProtocolPlanItem[];
  /** One full protocol per plan item, same order (generation stage) */
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
