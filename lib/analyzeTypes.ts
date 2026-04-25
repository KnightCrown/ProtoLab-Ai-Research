export type NoveltyClassification =
  | "no strong prior work"
  | "similar work exists"
  | "well studied";

export type LiteratureReference = {
  title: string;
  url: string;
};

export type AnalyzeResponseBody = {
  novelty: {
    classification: NoveltyClassification;
    reasoning: string;
    references: LiteratureReference[];
  };
  protocol: string[];
};
