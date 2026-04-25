import { NextResponse } from "next/server";
import { runPipeline, PipelineStageError } from "@/lib/orchestrator/runPipeline";
import type { PipelineResult } from "@/lib/pipeline/types";

export const maxDuration = 300;

function getKeys(): { openai: string; tavily: string } | { error: string } {
  const openai = process.env.OPENAI_API_KEY?.trim();
  const tavily = process.env.TAVILY_API_KEY?.trim();
  if (!openai || !tavily) {
    return {
      error:
        "Server is missing required API keys. Set OPENAI_API_KEY and TAVILY_API_KEY in the environment (e.g. .env.local for local dev).",
    };
  }
  return { openai, tavily };
}

export type GeneratePlanResponse = {
  plan: PipelineResult;
};

export async function POST(request: Request) {
  const keys = getKeys();
  if ("error" in keys) {
    return NextResponse.json({ error: keys.error }, { status: 500 });
  }

  let body: { hypothesis?: unknown };
  try {
    body = (await request.json()) as { hypothesis?: unknown };
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const hypothesis = typeof body.hypothesis === "string" ? body.hypothesis.trim() : "";
  if (!hypothesis) {
    return NextResponse.json({ error: 'Field "hypothesis" is required' }, { status: 400 });
  }

  try {
    const plan = await runPipeline({
      openaiApiKey: keys.openai,
      tavilyApiKey: keys.tavily,
      hypothesis,
    });
    const out: GeneratePlanResponse = { plan };
    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof PipelineStageError) {
      return NextResponse.json(
        { error: `Pipeline failed at [${e.stage}]: ${e.message}` },
        { status: 500 }
      );
    }
    const message = e instanceof Error ? e.message : "Plan generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
