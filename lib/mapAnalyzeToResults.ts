import type { AnalyzeResponseBody } from "./analyzeTypes";
import type { ExperimentResults } from "./experimentModel";

export function mapAnalyzeToResults(data: AnalyzeResponseBody): ExperimentResults {
  return {
    overview: {
      noveltyStatus: data.novelty.classification,
      summary: data.novelty.reasoning,
      references: data.novelty.references,
    },
    protocolSteps: data.protocol,
  };
}
