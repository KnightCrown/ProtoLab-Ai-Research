import type OpenAI from "openai";

function stripFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z0-9]*\n?/m, "").replace(/```\s*$/m, "").trim();
  }
  return t;
}

export async function completeJson(
  openai: OpenAI,
  params: {
    system: string;
    user: string;
    model?: string;
    max_tokens?: number;
  }
): Promise<Record<string, unknown>> {
  const res = await openai.chat.completions.create({
    model: params.model ?? "gpt-4o-mini",
    max_tokens: params.max_tokens ?? 1600,
    temperature: 0.15,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
  });
  const raw = res.choices[0]?.message?.content || "";
  const t = stripFences(raw);
  if (!t) throw new Error("Empty model output");
  try {
    return JSON.parse(t) as Record<string, unknown>;
  } catch {
    throw new Error("Model returned invalid JSON");
  }
}
