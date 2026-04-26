import { promises as fs } from "fs";
import path from "path";
import type { FeedbackRule, FeedbackStore } from "./types";

/**
 * Simple JSON-backed feedback store.
 *
 * Persists at <cwd>/data/feedback-store.json. The store is intentionally
 * file-based (not a DB) and tolerant of missing/corrupt state — if the
 * file cannot be read it is treated as empty so the pipeline never fails
 * because of a missing learning artefact.
 *
 * In-process writes are serialised through a Promise chain so concurrent
 * pipeline runs in the same Node process never lose updates due to
 * read-modify-write races.
 */

const STORE_PATH = path.join(process.cwd(), "data", "feedback-store.json");

let writeChain: Promise<unknown> = Promise.resolve();

function normalizeKey(rule: { type: string; issue: string }): string {
  return `${rule.type}::${rule.issue.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

async function ensureFile(): Promise<void> {
  try {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  } catch {
    // ignore
  }
  try {
    await fs.access(STORE_PATH);
  } catch {
    const empty: FeedbackStore = { rules: [] };
    await fs.writeFile(STORE_PATH, JSON.stringify(empty, null, 2), "utf-8");
  }
}

export async function loadStore(): Promise<FeedbackStore> {
  try {
    await ensureFile();
    const text = await fs.readFile(STORE_PATH, "utf-8");
    const data = JSON.parse(text) as Partial<FeedbackStore>;
    if (!data || !Array.isArray(data.rules)) return { rules: [] };
    return { rules: data.rules };
  } catch {
    return { rules: [] };
  }
}

async function saveStore(store: FeedbackStore): Promise<void> {
  await ensureFile();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

/**
 * Merge a batch of new rules into the store.
 * - Identical (type + normalised issue) rules increment count and lastSeen.
 * - Truly new rules are added with count = 1.
 */
export async function upsertRules(newRules: FeedbackRule[]): Promise<FeedbackStore> {
  if (newRules.length === 0) return loadStore();

  const work = writeChain.then(async () => {
    const store = await loadStore();
    const byKey = new Map(store.rules.map((r) => [normalizeKey(r), r]));
    const now = new Date().toISOString();

    for (const incoming of newRules) {
      const key = normalizeKey(incoming);
      const existing = byKey.get(key);
      if (existing) {
        existing.count += 1;
        existing.lastSeen = now;
      } else {
        byKey.set(key, { ...incoming, count: 1, lastSeen: now });
      }
    }

    const updated: FeedbackStore = { rules: Array.from(byKey.values()) };
    await saveStore(updated);
    return updated;
  });

  writeChain = work.catch(() => undefined);
  return work;
}

/**
 * Return the top-N most-frequent rules, breaking ties by recency.
 * Used to decide which directives to inject into the next generation.
 */
export async function getTopRules(limit: number = 10): Promise<FeedbackRule[]> {
  const store = await loadStore();
  return [...store.rules]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastSeen.localeCompare(a.lastSeen);
    })
    .slice(0, Math.max(0, limit));
}
