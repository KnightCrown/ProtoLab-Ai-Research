import { readFile } from "node:fs/promises";
import path from "node:path";

export type ProtocolExamplePayload = {
  full_text: string;
  version: string;
};

let _cachedExample: ProtocolExamplePayload | null = null;

export async function loadProtocolExample(): Promise<ProtocolExamplePayload> {
  if (_cachedExample) return _cachedExample;
  const filePath = path.join(process.cwd(), "protocol_example.md");
  const full_text = await readFile(filePath, "utf8");
  _cachedExample = { full_text, version: "0.1.0" };
  return _cachedExample;
}

/** Compact JSON for the model: style + format reference (truncated in prompt builder if huge). */
export function exampleAsJsonString(payload: ProtocolExamplePayload, maxChars: number): string {
  return JSON.stringify(
    {
      version: payload.version,
      full_text: payload.full_text.slice(0, maxChars),
    },
    null,
    0
  );
}
