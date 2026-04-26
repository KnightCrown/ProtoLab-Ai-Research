export type FeedbackRuleType =
  | "protocol"
  | "timeline"
  | "materials"
  | "validation"
  | "control"
  | "general";

export type FeedbackRule = {
  type: FeedbackRuleType;
  /** Original issue text from a prior trust score run. */
  issue: string;
  /** Generalised corrective directive injected into future generation. */
  fix: string;
  /** How many runs this rule has been observed in (used to prioritise top N). */
  count: number;
  /** ISO timestamp of the most recent run that triggered this rule. */
  lastSeen: string;
};

export type FeedbackStore = {
  rules: FeedbackRule[];
};
