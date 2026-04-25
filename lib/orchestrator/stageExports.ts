/**
 * Re-exports pipeline stages for tests, debugging, or partial execution.
 * Full production flow: `runPipeline` from `./runPipeline`.
 */

export { analyzeHypothesis } from "@/lib/pipeline/analyzeHypothesis";
export { literatureQC } from "@/lib/pipeline/literatureQC";
export { generateProtocol } from "@/lib/pipeline/generateProtocol";
export { generateMaterials } from "@/lib/pipeline/generateMaterials";
export { generateCost } from "@/lib/pipeline/generateCost";
export { generateTimeline } from "@/lib/pipeline/generateTimeline";
export { generateValidation } from "@/lib/pipeline/generateValidation";
