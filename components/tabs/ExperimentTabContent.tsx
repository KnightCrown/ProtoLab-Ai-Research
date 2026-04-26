"use client";

import { useState } from "react";
import { Card } from "@/components/common/Card";
import { DataTable } from "@/components/common/DataTable";
import type { ExperimentResults } from "@/lib/experimentModel";
import {
  displayTextForSystemImprovement,
  pickDiverseSystemImprovements,
  systemImprovementBadgeCount,
  MAX_SHOWN,
} from "@/lib/feedback/systemImprovementDisplay";
import type { TabId } from "@/lib/mockData";
import { procedureStepToNarrative } from "@/lib/procedureNarrative";
import type { LaboratoryProtocol, ProcedureStep } from "@/lib/pipeline/types";

const noveltyToneClass: Record<ExperimentResults["overview"]["noveltyKind"], string> = {
  no_prior: "text-red-600",
  similar: "text-amber-600",
  well_studied: "text-emerald-700",
};

function NoResultsPanel() {
  return (
    <div className="rounded-xl border border-dashed border-[#d6d2c1] bg-[#fffdf6] p-10 text-center shadow-sm">
      <p className="text-sm font-medium text-gray-900">No plan generated yet</p>
      <p className="mt-1 text-sm text-gray-500">
        Click <span className="font-medium">Generate Experiment Plan</span> to run the multi-stage
        pipeline.
      </p>
    </div>
  );
}

type ExperimentTabContentProps = {
  activeTab: TabId;
  results: ExperimentResults | null;
};

function trustTone(score: number): {
  text: string;
  bg: string;
  ring: string;
  confidenceBadge: string;
} {
  if (score >= 75) {
    return {
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      ring: "ring-emerald-200",
      confidenceBadge: "bg-emerald-100 text-emerald-800",
    };
  }
  if (score >= 45) {
    return {
      text: "text-amber-700",
      bg: "bg-amber-50",
      ring: "ring-amber-200",
      confidenceBadge: "bg-amber-100 text-amber-800",
    };
  }
  return {
    text: "text-rose-700",
    bg: "bg-rose-50",
    ring: "ring-rose-200",
    confidenceBadge: "bg-rose-100 text-rose-800",
  };
}

function ProcedureStepBlock({ step, depth = 0 }: { step: ProcedureStep; depth?: number }) {
  const narrative = procedureStepToNarrative(step);
  const hasSubs = step.sub_steps && step.sub_steps.length > 0;
  return (
    <div
      className={depth > 0 ? "mt-4 border-l-2 border-[#d7d3c5] pl-4" : ""}
      data-step={step.step_number}
    >
      <div className="border-b border-[#e6e1d2] py-4 last:border-b-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {step.kind ? <span className="text-slate-600">{step.kind} · </span> : null}
          Step {step.step_number}
        </p>
        {narrative && narrative !== "—" ? (
          <p className="mt-2 text-sm leading-relaxed text-gray-800">{narrative}</p>
        ) : hasSubs ? null : (
          <p className="mt-2 text-sm text-gray-500">—</p>
        )}
        {hasSubs
          ? step.sub_steps!.map((ss, i) => (
              <ProcedureStepBlock key={`${step.step_number}-sub-${i}`} step={ss} depth={depth + 1} />
            ))
          : null}
      </div>
    </div>
  );
}

function CollapsibleProtocol({ p, headerName }: { p: LaboratoryProtocol; headerName?: string }) {
  const [open, setOpen] = useState(false);
  const heading = (headerName && headerName.trim()) || p.title;
  return (
    <section
      className="border border-[#d6d2c1] bg-[#fffdf6]"
      aria-labelledby={`proto-title-${p.id}`}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 border-b border-[#dfdac8] bg-[#f7f4ea] px-5 py-4 text-left transition hover:bg-[#f3efe3] sm:px-8"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        id={`proto-title-${p.id}`}
      >
        <span className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">{heading}</span>
        <span
          className="mt-0.5 shrink-0 text-slate-500"
          aria-hidden
        >
          {open ? (
            <span className="text-base">▾</span>
          ) : (
            <span className="text-base">▸</span>
          )}
        </span>
      </button>
      {open ? (
        <div>
          <div className="px-5 py-4 sm:px-8 sm:py-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Objective</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-800">{p.objective}</p>
          </div>
          <div className="border-t border-[#e6e1d2] px-5 py-4 sm:px-8 sm:py-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Materials</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-800">
              {p.materials.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
          <div className="border-t border-[#dfdac8] px-5 pb-4 pt-2 sm:px-8 sm:pb-6">
            <h3 className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Procedure
            </h3>
            {p.procedure.map((step, i) => (
              <ProcedureStepBlock key={`${p.id}-p-${i}`} step={step} />
            ))}
          </div>
          {p.notes && p.notes.length > 0 ? (
            <div className="border-t border-[#dfdac8] bg-[#f7f4ea] px-5 py-4 sm:px-8 sm:py-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-900/80">
                Notes
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-800">
                {p.notes.map((n, i) => (
                  <li key={`${p.id}-n-${i}`} className="whitespace-pre-wrap">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function ExperimentTabContent({ activeTab, results }: ExperimentTabContentProps) {
  /** Dismissed until `appliedRules` changes to a new fingerprint (e.g. new run). */
  const [dismissedAppliedRulesKey, setDismissedAppliedRulesKey] = useState<string | null>(null);
  const appliedRulesKey = (results?.appliedRules ?? [])
    .map((r) => `${r.type}:${r.fix}`)
    .join("\u0000");
  const showSystemImprovements =
    (results?.appliedRules?.length ?? 0) > 0 && appliedRulesKey !== dismissedAppliedRulesKey;

  if (activeTab === "trust" && !results) {
    return (
      <div className="rounded-xl border border-dashed border-[#d6d2c1] bg-[#fffdf6] p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-900">Run an experiment to see trust score</p>
        <p className="mt-1 text-sm text-gray-500">
          The trust score appears after the full plan is generated and evaluated.
        </p>
      </div>
    );
  }

  if (!results) {
    return <NoResultsPanel />;
  }

  if (activeTab === "overview") {
    const o = results.overview;
    const d = o.experimentDesign;
    const tone = noveltyToneClass[o.noveltyKind];
    const refs = o.references ?? [];
    const plan = results.protocolPlan ?? [];
    const trust = results.trustScore;
    const trustToneVal = trust ? trustTone(trust.score) : null;
    const phases = results.timelinePhases ?? [];
    const totalDuration = results.timelineTotalDuration;
    const appliedRules = results.appliedRules ?? [];
    const rulesShown = pickDiverseSystemImprovements(appliedRules, MAX_SHOWN);
    const improvementBadge = systemImprovementBadgeCount(appliedRules.length);

    return (
      <div className="w-full space-y-4">

        {/* ── Banner: novelty + trust score ───────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {/* Novelty / literature */}
          <div className="flex flex-1 flex-col justify-between rounded-xl border border-[#d6d2c1] bg-[#fffdf6] px-5 py-5 shadow-sm sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Literature novelty
            </p>
            <p className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${tone}`}>
              {o.noveltyLabel}
            </p>
            {o.literatureInsight && o.literatureInsight !== "—" ? (
              <p className="mt-3 text-sm leading-6 text-gray-600 line-clamp-3">
                {o.literatureInsight}
              </p>
            ) : null}
            {refs.length > 0 ? (
              <p className="mt-3 text-xs text-gray-400">{refs.length} reference{refs.length !== 1 ? "s" : ""} found</p>
            ) : null}
          </div>

          {/* Trust score */}
          {trust && trustToneVal ? (
            <div
              className={`flex flex-col justify-between rounded-xl border px-5 py-5 shadow-sm ring-1 sm:w-52 sm:px-6 ${trustToneVal.bg} ${trustToneVal.ring}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Trust score
              </p>
              <p className={`mt-2 text-4xl font-extrabold tracking-tight ${trustToneVal.text}`}>
                {trust.score}<span className="text-xl font-semibold text-gray-400"> / 100</span>
              </p>
              <span
                className={`mt-3 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${trustToneVal.confidenceBadge}`}
              >
                {trust.confidence} confidence
              </span>
              {trust.issues.length > 0 ? (
                <p className="mt-2 text-xs text-gray-500">
                  {trust.issues.length} issue{trust.issues.length !== 1 ? "s" : ""} flagged
                </p>
              ) : (
                <p className="mt-2 text-xs text-emerald-600">No issues flagged</p>
              )}
            </div>
          ) : null}
        </div>

        {/* ── System improvements applied (iterative learning) ────────── */}
        {showSystemImprovements ? (
          <section className="relative rounded-xl border border-[#d6d2c1] bg-[#fffdf6] px-5 py-4 pr-12 shadow-sm sm:px-6 sm:pr-14">
            <button
              type="button"
              onClick={() => setDismissedAppliedRulesKey(appliedRulesKey)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-lg leading-none text-[#5c6650] transition hover:bg-[#f3efe3] focus:outline-none focus:ring-2 focus:ring-[#bcb79f]"
              aria-label="Close system improvements"
            >
              ×
            </button>
            <div className="flex items-center gap-2 pr-1">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#7f8572] text-[10px] font-bold text-[#f7f6ef]">
                ✓
              </span>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#4f5843]">
                System improvements applied
              </h2>
              <span className="ml-1 inline-flex items-center gap-1.5">
                <span className="rounded-full bg-[#ece7d8] px-2 py-0.5 text-[10px] font-semibold text-[#4f5843]">
                  {improvementBadge}
                </span>
                {appliedRules.length > MAX_SHOWN ? (
                  <span className="text-[10px] font-medium text-[#5b6550]">
                    ({appliedRules.length} total)
                  </span>
                ) : null}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#616b56]">
              High-level guidance from past runs (up to {MAX_SHOWN} focus areas, varied by category
              when possible). Full rule set is still used in generation.
            </p>
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {rulesShown.map((r, i) => (
                <li
                  key={`${r.type}-${i}`}
                  className="flex items-start gap-2 rounded-md bg-[#f7f4ea] px-2.5 py-1.5 text-xs text-[#4f5843] ring-1 ring-[#e6e1d2]"
                >
                  <span className="mt-0.5 inline-flex shrink-0 rounded bg-[#ece7d8] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#5e6951]">
                    {r.type}
                  </span>
                  <span className="leading-snug">{displayTextForSystemImprovement(r)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ── Experiment design ────────────────────────────────────────── */}
        <section className="rounded-xl border border-[#d6d2c1] bg-[#fffdf6] shadow-sm">
          <div className="border-b border-[#dfdac8] px-5 py-4 sm:px-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Experiment design
            </h2>
          </div>
          <div className="grid gap-0 divide-y divide-[#e6e1d2] px-5 py-1 text-sm sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-0 sm:py-0">
            <div className="space-y-4 py-4 sm:px-6 sm:py-5">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Independent variables</h3>
                {d.independentVariables.length ? (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-gray-800">
                    {d.independentVariables.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                ) : <p className="mt-1 text-gray-400">—</p>}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dependent variables</h3>
                {d.dependentVariables.length ? (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-gray-800">
                    {d.dependentVariables.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                ) : <p className="mt-1 text-gray-400">—</p>}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Control group</h3>
                <p className="mt-1 leading-relaxed text-gray-800">{d.controlGroup}</p>
              </div>
            </div>
            <div className="space-y-4 py-4 sm:px-6 sm:py-5">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Experimental groups</h3>
                {d.experimentalGroups.length ? (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-gray-800">
                    {d.experimentalGroups.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                ) : <p className="mt-1 text-gray-400">—</p>}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Measurement method</h3>
                <p className="mt-1 leading-relaxed text-gray-800">{d.measurementMethod}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Success criteria</h3>
                <p className="mt-1 leading-relaxed text-gray-800">{d.successCriteria}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Protocol plan ────────────────────────────────────────────── */}
        {plan.length > 0 ? (
          <section className="rounded-xl border border-[#d6d2c1] bg-[#fffdf6] shadow-sm">
            <div className="border-b border-[#dfdac8] px-5 py-4 sm:px-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Protocol plan
              </h2>
            </div>
            <ol className="divide-y divide-[#e6e1d2]">
              {plan.map((item, idx) => (
                <li key={item.id} className="flex gap-4 px-5 py-4 sm:px-6">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    {item.description && item.description !== "—" ? (
                      <p className="mt-0.5 text-sm text-gray-600">{item.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* ── Materials & cost summary ──────────────────────────────────── */}
        {results.materials && results.materials.length > 0 ? (
          <section className="rounded-xl border border-[#d6d2c1] bg-[#fffdf6] shadow-sm">
            <div className="flex items-center justify-between border-b border-[#dfdac8] px-5 py-4 sm:px-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Materials &amp; cost
              </h2>
              {results.totalCost ? (
                <span className="text-base font-bold text-gray-900">{results.totalCost}</span>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e6e1d2] bg-[#f7f4ea]">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-6">Item</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Supplier</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 sm:pr-6">Est. cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e1d2]">
                  {results.materials.map((m) => (
                    <tr key={m.item} className="hover:bg-[#f3efe3]">
                      <td className="px-5 py-2.5 font-medium text-gray-900 sm:px-6">{m.item}</td>
                      <td className="px-4 py-2.5 text-gray-600">{m.supplier}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-900 sm:pr-6">{m.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {results.costRange ? (
              <p className="border-t border-[#e6e1d2] px-5 py-2.5 text-right text-xs text-gray-500 sm:px-6">
                Range: {results.costRange.min} — {results.costRange.max}
                {results.costRange.note ? ` (${results.costRange.note})` : ""}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* ── Timeline ─────────────────────────────────────────────────── */}
        {phases.length > 0 ? (
          <section className="rounded-xl border border-[#d6d2c1] bg-[#fffdf6] shadow-sm">
            <div className="flex items-center justify-between border-b border-[#dfdac8] px-5 py-4 sm:px-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Timeline
              </h2>
              {totalDuration ? (
                <span className="text-sm font-bold text-gray-900">{totalDuration}</span>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e6e1d2] bg-[#f7f4ea]">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-6">Phase</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Deliverables</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 sm:pr-6">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e1d2]">
                  {phases.map((phase, idx) => (
                    <tr key={`${phase.name}-${idx}`} className="align-top hover:bg-[#f3efe3]">
                      <td className="px-5 py-3 font-semibold text-gray-900 sm:px-6">{phase.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {phase.deliverables.length > 1 ? (
                          <ul className="space-y-0.5">
                            {phase.deliverables.map((del) => (
                              <li key={del} className="flex items-start gap-1.5">
                                <span className="mt-1.5 block h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                                {del}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span>{phase.deliverables[0] ?? "—"}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900 sm:pr-6">{phase.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* ── References ───────────────────────────────────────────────── */}
        {refs.length > 0 ? (
          <section className="rounded-xl border border-[#d6d2c1] bg-[#fffdf6] px-5 py-5 shadow-sm sm:px-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              References
            </h2>
            <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-gray-800">
              {refs.map((r) => (
                <li key={r.url} className="pl-1">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-2 hover:decoration-gray-600"
                  >
                    {r.title}
                  </a>
                  <p className="mt-0.5 break-all text-xs text-gray-500">{r.url}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

      </div>
    );
  }

  if (activeTab === "protocol") {
    const plan = results.protocolPlan;
    const prots = results.laboratoryProtocols;
    if (prots && prots.length > 0) {
      return (
        <div className="w-full space-y-6">
          {plan && plan.length > 0 ? (
            <section className="border border-[#d6d2c1] bg-[#fffdf6] px-5 py-4 sm:px-8 sm:py-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Experiment plan
              </h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-800">
                {plan.map((item) => (
                  <li key={item.id} className="pl-1">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    {item.description ? (
                      <p className="mt-1 text-gray-600">{item.description}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {prots.map((p) => {
            const fromPlan = plan?.find((x) => x.id === p.id)?.name;
            return <CollapsibleProtocol key={p.id} p={p} headerName={fromPlan} />;
          })}
        </div>
      );
    }
    return (
      <div className="w-full max-w-4xl border border-[#d6d2c1] bg-[#fffdf6] px-5 py-6 sm:px-8">
        <h2 className="text-sm font-semibold text-gray-900">Protocol (plain text)</h2>
        <ol className="mt-4 space-y-3 text-sm leading-7 text-gray-800">
          {results.protocolSteps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ece7d8] text-xs font-semibold text-[#5e6652]">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (activeTab === "materials") {
    if (results.materials == null || results.materials.length === 0) {
      return (
        <Card title="Materials & Cost">
          <p className="text-sm text-gray-600">No materials in this plan.</p>
        </Card>
      );
    }
    return (
      <div className="space-y-4">
        <Card title="Materials & Cost">
          <DataTable
            columns={[
              { header: "Item", key: "item" },
              { header: "Supplier", key: "supplier" },
              { header: "Est. cost", key: "cost", align: "right" },
            ]}
            rows={results.materials}
          />
          {results.totalCost ? (
            <p className="mt-4 text-right text-sm font-semibold text-gray-900">
              Est. total: {results.totalCost}
            </p>
          ) : null}
          {results.costRange ? (
            <p className="mt-1 text-right text-sm text-gray-600">
              Range: {results.costRange.min} — {results.costRange.max}
              {results.costRange.note ? ` (${results.costRange.note})` : ""}
            </p>
          ) : null}
        </Card>
        {results.materialsDetail && results.materialsDetail.length > 0 ? (
          <Card title="Sourcing">
            <ul className="space-y-4 text-sm text-gray-700">
              {results.materialsDetail.map((m) => {
                const hasSource = m.sourceUrl && m.sourceUrl !== "#";
                const priceMissing = m.price === "Price unavailable";
                return (
                  <li
                    key={m.name + m.sourceUrl}
                    className="border-b border-[#e6e1d2] pb-4 last:border-0"
                  >
                    <p className="font-medium text-gray-900">{m.productName || m.name}</p>
                    <p className="text-xs text-gray-500">{m.spec}</p>
                    <p className="text-xs">Supplier: {m.supplier}</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                      <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs">Price: {m.price}</span>
                        {m.priceGrounded && !priceMissing ? (
                          <span
                            title="Price extracted from a live search result"
                            className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                          >
                            verified
                          </span>
                        ) : !priceMissing ? (
                          <span
                            title="No price in search — shown value is a market estimate when present"
                            className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20"
                          >
                            estimated
                          </span>
                        ) : (
                          <span
                            title="No reliable price in search results"
                            className="inline-flex items-center rounded-full bg-[#ece7d8] px-1.5 py-0.5 text-[10px] font-medium text-[#5f6753] ring-1 ring-inset ring-[#d3ccb9]"
                          >
                            unavailable
                          </span>
                        )}
                      </div>
                      {hasSource ? (
                        <a
                          href={m.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 self-end sm:self-auto rounded-md bg-[#7f8572] px-3 py-1.5 text-center text-xs font-semibold text-[#f7f6ef] transition hover:bg-[#6f7663] sm:ml-auto"
                        >
                          Buy now
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="No product link in search results"
                          className="inline-flex shrink-0 cursor-not-allowed self-end sm:self-auto rounded-md border border-[#d6d2c1] bg-[#f7f4ea] px-3 py-1.5 text-center text-xs font-medium text-[#9a9787] sm:ml-auto"
                        >
                          Buy now
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}
        {results.costLineItems && results.costLineItems.length > 0 ? (
          <Card title="Cost breakdown">
            <ul className="space-y-2 text-sm text-gray-700">
              {results.costLineItems.map((row) => (
                <li key={row.label} className="flex justify-between gap-4 border-b border-[#e6e1d2] py-1">
                  <span>{row.label}</span>
                  <span className="font-medium text-gray-900">{row.amount}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {results.costDrivers && results.costDrivers.length > 0 ? (
          <Card title="Cost drivers">
            <ul className="list-disc pl-5 text-sm text-gray-700">
              {results.costDrivers.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    );
  }

  if (activeTab === "timeline") {
    const phases = results.timelinePhases ?? [];
    const sp = results.staffingPlan;
    const deps = results.timelineDependencies ?? [];
    const perProto = results.protocolDurations ?? [];
    const dConstraints = results.durationConstraints ?? [];

    /** Derive a sensible personnel string for a phase based on its name. */
    function phasePersonnel(phaseName: string): string {
      if (!sp) return "—";
      const n = phaseName.toLowerCase();
      if (/incubat|wait|block|passiv/.test(n)) return "1 researcher";
      if (/analys|data|statist|process|interpret/.test(n))
        return `${Math.max(1, Math.ceil(sp.total_people / 2))} researcher${Math.max(1, Math.ceil(sp.total_people / 2)) !== 1 ? "s" : ""}`;
      return `${sp.total_people} researcher${sp.total_people !== 1 ? "s" : ""}`;
    }

    return (
      <div className="space-y-5">
        {/* ── Project schedule ──────────────────────────────────────────── */}
        <section className="border border-[#d6d2c1] bg-[#fffdf6]">
          <div className="border-b border-[#dfdac8] px-5 py-3 sm:px-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Project schedule
            </h2>
            {results.timelineTotalDuration ? (
              <p className="mt-0.5 text-sm text-gray-700">
                Total duration:{" "}
                <span className="font-semibold text-gray-900">{results.timelineTotalDuration}</span>
              </p>
            ) : null}
          </div>

          {perProto.length > 0 ? (
            <div className="border-b border-[#dfdac8] px-5 py-4 sm:px-8">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Per-protocol duration</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e6e1d2] text-left text-xs text-gray-500">
                      <th className="py-2 pr-3 font-medium">SOP</th>
                      <th className="py-2 pl-2 text-right font-medium">Span</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6e1d2]">
                    {perProto.map((row) => (
                      <tr key={row.id} className="text-gray-800">
                        <td className="py-2 pr-2 font-medium">{row.name}</td>
                        <td className="py-2 pl-2 text-right tabular-nums">{row.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {dConstraints.length > 0 ? (
            <div className="border-b border-[#e6e1d2] bg-[#f7f4ea] px-5 py-3 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Duration grounding</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-gray-600">
                {dConstraints.map((c, i) => (
                  <li key={`dc-${i}`}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {phases.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-500">No phase data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dfdac8] bg-[#f7f4ea]">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-8">
                      Phase
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Tasks
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:pr-8">
                      Personnel
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e1d2]">
                  {phases.map((phase, idx) => (
                    <tr
                      key={`${phase.name}-${idx}`}
                      className="align-top transition-colors hover:bg-[#f3efe3]"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900 sm:px-8">
                        {phase.name}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {phase.deliverables.length > 1 ? (
                          <ul className="space-y-0.5">
                            {phase.deliverables.map((d) => (
                              <li key={d} className="flex items-start gap-1.5">
                                <span className="mt-1.5 block h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                                {d}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span>{phase.deliverables[0] ?? "—"}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {phase.duration}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700 sm:pr-8">
                        {phasePersonnel(phase.name)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {results.timelineWebNote ? (
            <p className="border-t border-[#e6e1d2] px-5 py-2 text-xs text-gray-400 sm:px-8">
              Source note: {results.timelineWebNote.slice(0, 300)}
            </p>
          ) : null}
        </section>

        {/* ── Staffing ──────────────────────────────────────────────────── */}
        {sp ? (
          <section className="border border-[#d6d2c1] bg-[#fffdf6]">
            <div className="border-b border-[#dfdac8] px-5 py-3 sm:px-8">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Staffing
              </h2>
              <p className="mt-0.5 text-sm text-gray-700">
                Total headcount:{" "}
                <span className="font-semibold text-gray-900">
                  {sp.total_people} {sp.total_people === 1 ? "person" : "people"}
                </span>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dfdac8] bg-[#f7f4ea]">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-8">
                      Role
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 sm:pr-8">
                      Est. hours
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e1d2]">
                  {Object.entries(sp.hours_per_role).map(([role, hours]) => (
                    <tr key={role} className="hover:bg-[#f3efe3]">
                      <td className="px-5 py-3 text-gray-900 sm:px-8">{role}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 sm:pr-8">
                        {hours}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* ── Dependencies ──────────────────────────────────────────────── */}
        {deps.length > 0 ? (
          <section className="border border-[#d6d2c1] bg-[#fffdf6] px-5 py-4 sm:px-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Dependencies
            </h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {deps.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  if (activeTab === "trust") {
    const trust = results.trustScore;
    if (!trust) {
      return (
        <Card title="Trust score">
          <p className="text-sm text-gray-600">
            Trust scoring is unavailable for this plan (legacy or incomplete data).
          </p>
        </Card>
      );
    }
    const tone = trustTone(trust.score);
    return (
      <div className="space-y-4">
        <section className={`rounded-xl border border-[#d6d2c1] bg-[#fffdf6] p-6 shadow-sm ring-1 ${tone.ring}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Trust score</p>
          <p className={`mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl ${tone.text}`}>
            {trust.score} / 100
          </p>
          <div className="mt-4">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone.confidenceBadge}`}
            >
              Confidence: {trust.confidence}
            </span>
          </div>
        </section>

        <Card title="Issues to address">
          {trust.issues.length === 0 ? (
            <p className="text-sm text-emerald-700">No major issues were flagged.</p>
          ) : (
            <ul className="list-disc space-y-2 pl-5 text-sm text-gray-800">
              {trust.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </Card>

        <div className={`rounded-xl border p-3 text-xs ${tone.bg} ${tone.text}`}>
          Score bands: 75-100 high trust, 45-74 medium trust, 0-44 low trust.
        </div>
      </div>
    );
  }

  return null;
}
