import { readFile } from "node:fs/promises";
import path from "node:path";

export type ProtocolRulesPayload = {
  /** Full markdown text from protocol_rules.md */
  full_text: string;
  /** Short structured summary for token control (full text also sent in protocol stage) */
  constraints_bullets: string[];
  version: string;
};

function extractBullets(md: string): string[] {
  const lines = md.split(/\r?\n/);
  const bullets: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("- ") || t.startsWith("* ")) {
      bullets.push(t.replace(/^[-*]\s+/, "").trim());
    }
  }
  return bullets.slice(0, 40);
}

export async function loadProtocolRules(): Promise<ProtocolRulesPayload> {
  const filePath = path.join(process.cwd(), "protocol_rules.md");
  const full_text = await readFile(filePath, "utf8");
  return {
    full_text,
    constraints_bullets: extractBullets(full_text),
    version: "0.4.0",
  };
}

export function rulesAsJsonString(payload: ProtocolRulesPayload): string {
  return JSON.stringify(
    {
      version: payload.version,
      constraints_bullets: payload.constraints_bullets,
      full_text: payload.full_text.slice(0, 12000),
    },
    null,
    0
  );
}
