/**
 * Pipeline timing system.
 *
 * Three surfaces:
 *   1. makeTimedLog()      — wraps any PipelineLogFn so every existing
 *                            log("stage","start") / log("stage","complete") call
 *                            automatically gains ts / duration_ms fields.
 *                            No changes needed in individual stage files.
 *
 *   2. createStageTimer()  — explicit start/end API for new code that does
 *                            not already call log("stage","start|complete").
 *
 *   3. timed()             — one-liner async wrapper, useful in orchestrators.
 *
 * Parallel stages are handled correctly: each stage name has its own FIFO
 * queue of start timestamps, so six concurrent "protocol_generation" calls
 * each pop the oldest matching start when they complete.
 */

import type { PipelineLogFn } from "@/lib/pipeline/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StageTiming = {
  stage: string;
  duration_ms: number;
  start_ts: number;
  end_ts: number;
};

export type PipelineSummary = {
  total_time_ms: number;
  stages: Record<string, number>;
  slowest_stages: { stage: string; duration_ms: number }[];
};

// ---------------------------------------------------------------------------
// PipelineTimer — per-request accumulator; must NOT be a module-level singleton
// ---------------------------------------------------------------------------

export class PipelineTimer {
  private readonly timings: StageTiming[] = [];
  private readonly pipelineStart = performance.now();

  record(timing: StageTiming): void {
    this.timings.push(timing);
  }

  /**
   * Returns aggregated stats for the whole pipeline run.
   * Stages that ran multiple times (e.g. protocol_generation × N) have their
   * durations summed so the table shows wall-time contribution per stage type.
   */
  summary(): PipelineSummary {
    const total_time_ms = Math.round(performance.now() - this.pipelineStart);

    const aggregated: Record<string, number> = {};
    for (const t of this.timings) {
      aggregated[t.stage] = (aggregated[t.stage] ?? 0) + t.duration_ms;
    }

    const slowest_stages = Object.entries(aggregated)
      .map(([stage, duration_ms]) => ({ stage, duration_ms }))
      .sort((a, b) => b.duration_ms - a.duration_ms)
      .slice(0, 8);

    return { total_time_ms, stages: aggregated, slowest_stages };
  }
}

// ---------------------------------------------------------------------------
// makeTimedLog — transparent wrapper (zero changes needed to stage files)
// ---------------------------------------------------------------------------

function normalizeDetail(d: unknown): Record<string, unknown> {
  if (d && typeof d === "object" && !Array.isArray(d)) {
    return d as Record<string, unknown>;
  }
  return d !== undefined ? { value: d } : {};
}

/**
 * Wraps a PipelineLogFn so that:
 *   log(stage, "start", meta)    → adds `ts` (performance.now snapshot)
 *   log(stage, "complete", meta) → adds `duration_ms` and `end_ts`
 *
 * A FIFO queue per stage name handles parallel stages: the first "complete"
 * for a stage pops the oldest "start" timestamp for that stage.
 */
export function makeTimedLog(rawLog: PipelineLogFn, timer: PipelineTimer): PipelineLogFn {
  // stage name → ordered list of start timestamps (oldest first)
  const queues = new Map<string, number[]>();

  return (stage: string, message: string, detail?: unknown) => {
    if (message === "start") {
      const ts = performance.now();
      const q = queues.get(stage) ?? [];
      q.push(ts);
      queues.set(stage, q);
      rawLog(stage, "start", { ...normalizeDetail(detail), ts: Math.round(ts) });
      return;
    }

    if (message === "complete") {
      const endTs = performance.now();
      const q = queues.get(stage);
      const startTs = q?.shift(); // pop oldest pending start for this stage
      const duration_ms = startTs != null ? Math.round(endTs - startTs) : undefined;

      if (duration_ms != null && startTs != null) {
        timer.record({
          stage,
          duration_ms,
          start_ts: Math.round(startTs),
          end_ts: Math.round(endTs),
        });
      }

      rawLog(stage, "complete", {
        ...normalizeDetail(detail),
        ...(duration_ms != null ? { duration_ms, end_ts: Math.round(endTs) } : {}),
      });
      return;
    }

    // Pass all other messages (warn, note, tavily, …) through unchanged.
    rawLog(stage, message, detail);
  };
}

// ---------------------------------------------------------------------------
// createStageTimer — explicit start/end API for new stage code
// ---------------------------------------------------------------------------

export type StageTimer = {
  /** Record start time and emit a "start" log entry. */
  start(meta?: Record<string, unknown>): void;
  /** Calculate duration, record it, and emit a "complete" log entry. */
  end(meta?: Record<string, unknown>): void;
};

/**
 * Returns a self-contained start/end timer for a single stage invocation.
 * Safe to call concurrently: each call creates an independent closure.
 *
 * Usage:
 *   const t = createStageTimer("my_stage", pipelineTimer, log);
 *   t.start({ plan_id });
 *   const result = await doWork();
 *   t.end({ rows: result.length });
 */
export function createStageTimer(
  stageName: string,
  timer: PipelineTimer,
  log: PipelineLogFn
): StageTimer {
  let startTs: number | null = null;

  return {
    start(meta: Record<string, unknown> = {}): void {
      startTs = performance.now();
      log(stageName, "start", { ...meta, ts: Math.round(startTs) });
    },

    end(meta: Record<string, unknown> = {}): void {
      const endTs = performance.now();
      const duration_ms = startTs != null ? Math.round(endTs - startTs) : 0;
      timer.record({ stage: stageName, duration_ms, start_ts: Math.round(startTs ?? endTs), end_ts: Math.round(endTs) });
      log(stageName, "complete", { ...meta, duration_ms, end_ts: Math.round(endTs) });
    },
  };
}

// ---------------------------------------------------------------------------
// timed — one-liner async wrapper
// ---------------------------------------------------------------------------

/**
 * Measures an async function and records the timing.
 *
 * Usage:
 *   const result = await timed("my_stage", timer, log, () => doWork(), { plan_id });
 */
export async function timed<T>(
  stageName: string,
  timer: PipelineTimer,
  log: PipelineLogFn,
  fn: () => Promise<T>,
  startMeta: Record<string, unknown> = {}
): Promise<T> {
  const t = createStageTimer(stageName, timer, log);
  t.start(startMeta);
  try {
    const result = await fn();
    t.end();
    return result;
  } catch (err) {
    t.end({ error: true });
    throw err;
  }
}
