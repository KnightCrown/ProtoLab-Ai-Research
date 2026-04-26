import type { LiteratureReference } from "./analyzeTypes";
import type { MaterialRow, TrustIssue } from "./mockData";
import type {
  LaboratoryProtocol,
  ProtocolPlanItem,
  StaffingPlan,
  StepTimeline,
  ValidationPlan,
} from "./pipeline/types";

/** Maps literature novelty to Overview accent and primary label */
export type NoveltyKind = "no_prior" | "similar" | "well_studied";

export type ExperimentDesignOverview = {
  independentVariables: string[];
  dependentVariables: string[];
  controlGroup: string;
  experimentalGroups: string[];
  measurementMethod: string;
  successCriteria: string;
};

export type MaterialDetailRow = {
  name: string;
  productName: string;
  supplier: string;
  price: string;
  sourceUrl: string;
  spec: string;
  /** False when the price is a market estimate — no real price was found in search results. */
  priceGrounded: boolean;
};

/**
 * UI-facing experiment result (pipeline maps into this shape).
 */
export type ExperimentResults = {
  overview: {
    noveltyLabel: string;
    noveltyKind: NoveltyKind;
    literatureInsight: string;
    experimentDesign: ExperimentDesignOverview;
    references?: LiteratureReference[];
  };
  /** Planned procedure list (before full SOP text) */
  protocolPlan?: ProtocolPlanItem[];
  /** Full protocols, one per plan item, same order */
  laboratoryProtocols?: LaboratoryProtocol[];
  /** Flattened one-line per step (all procedures), for search / compact copy */
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
