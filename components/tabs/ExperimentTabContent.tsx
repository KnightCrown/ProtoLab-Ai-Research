"use client";

import { useState } from "react";
import { Card } from "@/components/common/Card";
import { DataTable } from "@/components/common/DataTable";
import type { ExperimentResults } from "@/lib/experimentModel";
import type { TabId } from "@/lib/mockData";
import type { LaboratoryProtocol, ProcedureStep, ProtocolConditions } from "@/lib/pipeline/types";

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

function formatConditionLines(c: ProtocolConditions | undefined): string[] {
  if (!c) return [];
  return [
    c.temperature ? `Temperature: ${c.temperature}` : null,
    c.time ? `Time: ${c.time}` : null,
    c.concentration ? `Concentration: ${c.concentration}` : null,
    c.other ? `Other: ${c.other}` : null,
  ].filter((x): x is string => Boolean(x));
}

function ProcedureStepBlock({ step, depth = 0 }: { step: ProcedureStep; depth?: number }) {
  const condLines = formatConditionLines(step.conditions);
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
        {step.text ? (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{step.text}</p>
        ) : null}
        {step.action ? (
          <p className="mt-2 text-sm leading-relaxed text-gray-800">
            <span className="font-semibold text-gray-900">Action: </span>
            {step.action}
          </p>
        ) : null}
        {step.inputs && step.inputs.length > 0 ? (
          <div className="mt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inputs</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-gray-800">
              {step.inputs.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {step.quantities ? (
          <p className="mt-2 text-sm">
            <span className="font-semibold text-gray-900">Quantities: </span>
            <span className="font-mono text-[13px] text-gray-900">{step.quantities}</span>
          </p>
        ) : null}
        {condLines.length > 0 ? (
          <div className="mt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Conditions</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">
              {condLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {step.output ? (
          <p className="mt-2 text-sm leading-relaxed text-gray-800">
            <span className="font-semibold text-gray-900">Output: </span>
            {step.output}
          </p>
        ) : null}
        {step.observation ? (
          <p className="mt-2 text-sm leading-relaxed text-gray-800">
            <span className="font-semibold text-gray-900">Observation: </span>
            {step.observation}
          </p>
        ) : null}
        {step.sub_steps?.map((ss, i) => (
          <ProcedureStepBlock key={`${step.step_number}-sub-${i}`} step={ss} depth={depth + 1} />
        ))}
      </div>
    </div>
  );
}

function CollapsibleProtocol({ p }: { p: LaboratoryProtocol }) {
  const [open, setOpen] = useState(true);
  return (
    <section
      className="border border-gray-200 bg-white"
      aria-labelledby={`proto-title-${p.protocol_id}`}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 border-b border-gray-200 bg-slate-50/90 px-5 py-4 text-left transition hover:bg-slate-100/90 sm:px-8"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        id={`proto-title-${p.protocol_id}`}
      >
        <span className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">{p.title}</span>
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
              <ProcedureStepBlock key={`${p.protocol_id}-p-${i}`} step={step} />
            ))}
          </div>
          {p.notes_and_calculations && p.notes_and_calculations.length > 0 ? (
            <div className="border-t border-gray-200 bg-amber-50/40 px-5 py-4 sm:px-8 sm:py-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-900/80">
                Notes and calculations
              </h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-800">
                {p.notes_and_calculations.map((n, i) => (
                  <li key={`${p.protocol_id}-n-${i}`} className="whitespace-pre-wrap">
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
    const prots = results.laboratoryProtocols;
    if (prots && prots.length > 0) {
      return (
        <div className="w-full space-y-6">
          {prots.map((p) => (
            <CollapsibleProtocol key={p.protocol_id} p={p} />
          ))}
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
          <Card title="Sourcing (Tavily-backed)">
            <ul className="space-y-3 text-sm text-gray-700">
              {results.materialsDetail.map((m) => (
                <li key={m.name + m.sourceUrl} className="border-b border-gray-100 pb-2 last:border-0">
                  <p className="font-medium text-gray-900">{m.productName || m.name}</p>
                  <p className="text-xs text-gray-500">{m.spec}</p>
                  <p className="text-xs">Supplier: {m.supplier}</p>
                  <p className="text-xs">Price: {m.price}</p>
                  <a
                    href={m.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-700 underline"
                  >
                    Source
                  </a>
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
    const lines = results.timeline ?? [];
    const st = results.stepTimelines ?? [];
    const sp = results.staffingPlan;
    return (
      <div className="space-y-4">
        <section className="grid gap-4 md:grid-cols-2">
          <Card title="Phased timeline">
            {lines.length === 0 ? (
              <p className="text-sm text-gray-600">No timeline data.</p>
            ) : (
              <ul className="space-y-2 text-sm text-gray-700">
                {lines.map((entry) => (
                  <li key={entry} className="rounded-lg bg-gray-50 px-3 py-2">
                    {entry}
                  </li>
                ))}
              </ul>
            )}
            {results.timelineTotalDuration ? (
              <p className="mt-3 text-sm font-medium text-gray-900">
                Total: {results.timelineTotalDuration}
              </p>
            ) : null}
            {results.timelineWebNote ? (
              <p className="mt-2 text-xs text-gray-500">Web hint: {results.timelineWebNote}</p>
            ) : null}
          </Card>
          <Card title="Dependencies">
            {results.timelineDependencies && results.timelineDependencies.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {results.timelineDependencies.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-600">No dependency list.</p>
            )}
          </Card>
        </section>
        {st.length > 0 ? (
          <Card title="Per-step schedule">
            <ul className="space-y-2 text-sm text-gray-700">
              {st.map((s) => (
                <li
                  key={s.step_number}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2"
                >
                  <span className="font-medium text-gray-900">
                    {s.step_number}. {s.type}
                  </span>
                  <span className="text-gray-500">{s.estimated_duration}</span>
                  <p className="w-full text-xs text-gray-600">{s.step}</p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {sp ? (
          <Card title="Staffing (heuristic)">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Headcount (planning):</span> {sp.total_people} people
            </p>
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-medium">Roles:</span> {sp.roles.join(", ")}
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
              {Object.entries(sp.hours_per_role).map(([role, h]) => (
                <li key={role}>
                  {role}: {h}h
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    );
  }

  if (activeTab === "trust") {
    const v = results.validation;
    if (!v) {
      return (
        <Card title="Validation & statistics">
          <p className="text-sm text-gray-600">No validation block for this plan (legacy data).</p>
        </Card>
      );
    }
    return (
      <div className="space-y-4">
        <Card title="Measurement">
          <p className="text-sm leading-6 text-gray-800">{v.measurement_method}</p>
        </Card>
        <Card title="Statistical analysis">
          <p className="text-sm leading-6 text-gray-800">{v.statistical_test}</p>
        </Card>
        <Card title="Success criteria">
          <p className="text-sm leading-6 text-gray-800">{v.success_criteria}</p>
        </Card>
        <Card title="Sources of error / confounders">
          <ul className="list-disc pl-5 text-sm text-gray-700">
            {v.sources_of_error.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  return null;
}
