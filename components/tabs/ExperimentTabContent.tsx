"use client";

import { useState } from "react";
import { Card } from "@/components/common/Card";
import { DataTable } from "@/components/common/DataTable";
import type { ExperimentResults } from "@/lib/experimentModel";
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
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
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
      className={depth > 0 ? "mt-4 border-l-2 border-slate-200 pl-4" : ""}
      data-step={step.step_number}
    >
      <div className="border-b border-gray-200 py-4 last:border-b-0">
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
  const [open, setOpen] = useState(true);
  const heading = (headerName && headerName.trim()) || p.title;
  return (
    <section
      className="border border-gray-200 bg-white"
      aria-labelledby={`proto-title-${p.id}`}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 border-b border-gray-200 bg-slate-50/90 px-5 py-4 text-left transition hover:bg-slate-100/90 sm:px-8"
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
          <div className="border-t border-gray-100 px-5 py-4 sm:px-8 sm:py-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Materials</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-800">
              {p.materials.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
          <div className="border-t border-gray-200 px-5 pb-4 pt-2 sm:px-8 sm:pb-6">
            <h3 className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Procedure
            </h3>
            {p.procedure.map((step, i) => (
              <ProcedureStepBlock key={`${p.id}-p-${i}`} step={step} />
            ))}
          </div>
          {p.notes && p.notes.length > 0 ? (
            <div className="border-t border-gray-200 bg-amber-50/40 px-5 py-4 sm:px-8 sm:py-5">
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
  if (activeTab === "trust" && !results) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
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
    return (
      <article className="w-full max-w-4xl border border-gray-200 bg-white text-gray-900">
        <div className="border-b border-gray-200 px-5 py-6 sm:px-8">
          <p className={`text-2xl font-bold tracking-tight sm:text-3xl ${tone}`}>
            {o.noveltyLabel}
          </p>
        </div>
        <div className="border-b border-gray-200 px-5 py-6 sm:px-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Literature insight
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-800">
            {o.literatureInsight === "—" ? (
              <span className="text-gray-500">No additional reasoning was returned.</span>
            ) : (
              o.literatureInsight
            )}
          </p>
        </div>
        <div className="px-5 py-6 sm:px-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Experiment design
          </h2>
          <div className="mt-6 space-y-6 text-sm">
            <section>
              <h3 className="text-sm font-semibold text-gray-900">Independent variables</h3>
              {d.independentVariables.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-800">
                  {d.independentVariables.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-gray-500">—</p>
              )}
            </section>
            <section>
              <h3 className="text-sm font-semibold text-gray-900">Dependent variables</h3>
              {d.dependentVariables.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-800">
                  {d.dependentVariables.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-gray-500">—</p>
              )}
            </section>
            <section>
              <h3 className="text-sm font-semibold text-gray-900">Control group</h3>
              <p className="mt-2 leading-relaxed text-gray-800">{d.controlGroup}</p>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-gray-900">Experimental groups</h3>
              {d.experimentalGroups.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-800">
                  {d.experimentalGroups.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-gray-500">—</p>
              )}
            </section>
            <section>
              <h3 className="text-sm font-semibold text-gray-900">Measurement method</h3>
              <p className="mt-2 leading-relaxed text-gray-800">{d.measurementMethod}</p>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-gray-900">Success criteria</h3>
              <p className="mt-2 leading-relaxed text-gray-800">{d.successCriteria}</p>
            </section>
          </div>
        </div>
        {refs.length > 0 ? (
          <div className="border-t border-gray-200 bg-gray-50/80 px-5 py-6 sm:px-8">
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
          </div>
        ) : null}
      </article>
    );
  }

  if (activeTab === "protocol") {
    const plan = results.protocolPlan;
    const prots = results.laboratoryProtocols;
    if (prots && prots.length > 0) {
      return (
        <div className="w-full space-y-6">
          {plan && plan.length > 0 ? (
            <section className="border border-gray-200 bg-white px-5 py-4 sm:px-8 sm:py-5">
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
      <div className="w-full max-w-4xl border border-gray-200 bg-white px-5 py-6 sm:px-8">
        <h2 className="text-sm font-semibold text-gray-900">Protocol (plain text)</h2>
        <ol className="mt-4 space-y-3 text-sm leading-7 text-gray-800">
          {results.protocolSteps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
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
            <ul className="space-y-3 text-sm text-gray-700">
              {results.materialsDetail.map((m) => (
                <li key={m.name + m.sourceUrl} className="border-b border-gray-100 pb-2 last:border-0">
                  <p className="font-medium text-gray-900">{m.productName || m.name}</p>
                  <p className="text-xs text-gray-500">{m.spec}</p>
                  <p className="text-xs">Supplier: {m.supplier}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-xs">Price: {m.price}</span>
                    {m.priceGrounded ? (
                      <span
                        title="Price extracted from a live search result"
                        className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                      >
                        verified
                      </span>
                    ) : (
                      <span
                        title="No price found in search results — this is a market estimate"
                        className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20"
                      >
                        estimated
                      </span>
                    )}
                  </div>
                  {m.sourceUrl && m.sourceUrl !== "#" ? (
                    <a
                      href={m.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block text-xs text-blue-700 underline"
                    >
                      Source ↗
                    </a>
                  ) : (
                    <span className="mt-0.5 block text-xs text-gray-400">No source URL</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {results.costLineItems && results.costLineItems.length > 0 ? (
          <Card title="Cost breakdown">
            <ul className="space-y-2 text-sm text-gray-700">
              {results.costLineItems.map((row) => (
                <li key={row.label} className="flex justify-between gap-4 border-b border-gray-100 py-1">
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
        <section className="border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-3 sm:px-8">
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

          {phases.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-500">No phase data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-slate-50">
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
                <tbody className="divide-y divide-gray-100">
                  {phases.map((phase, idx) => (
                    <tr
                      key={`${phase.name}-${idx}`}
                      className="align-top transition-colors hover:bg-slate-50/60"
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
            <p className="border-t border-gray-100 px-5 py-2 text-xs text-gray-400 sm:px-8">
              Source note: {results.timelineWebNote.slice(0, 300)}
            </p>
          ) : null}
        </section>

        {/* ── Staffing ──────────────────────────────────────────────────── */}
        {sp ? (
          <section className="border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-3 sm:px-8">
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
                  <tr className="border-b border-gray-200 bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:px-8">
                      Role
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 sm:pr-8">
                      Est. hours
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(sp.hours_per_role).map(([role, hours]) => (
                    <tr key={role} className="hover:bg-slate-50/60">
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
          <section className="border border-gray-200 bg-white px-5 py-4 sm:px-8">
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
        <section className={`rounded-xl border bg-white p-6 shadow-sm ring-1 ${tone.ring}`}>
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
