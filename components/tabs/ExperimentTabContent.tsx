import { Card } from "@/components/common/Card";
import { DataTable } from "@/components/common/DataTable";
import type { ExperimentResults } from "@/lib/experimentModel";
import type { TabId } from "@/lib/mockData";

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

export function ExperimentTabContent({ activeTab, results }: ExperimentTabContentProps) {
  if (!results) {
    return <NoResultsPanel />;
  }

  if (activeTab === "overview") {
    const refs = results.overview.references ?? [];
    const hi = results.overview.hypothesisHighlights;
    return (
      <div className="space-y-4">
        <section className="grid gap-4 md:grid-cols-2">
          <Card title="Novelty (literature QC)">
            <p className="text-lg font-semibold text-gray-900">{results.overview.noveltyStatus}</p>
          </Card>
          <Card title="Reasoning & design">
            <div className="space-y-3 text-sm leading-6 text-gray-700">
              {results.overview.summary.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </Card>
        </section>
        {hi ? (
          <section className="grid gap-4 md:grid-cols-2">
            <Card title="Independent variables">
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {hi.independent.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </Card>
            <Card title="Dependent variables">
              <ul className="list-disc pl-5 text-sm text-gray-700">
                {hi.dependent.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </Card>
          </section>
        ) : null}
        {refs.length > 0 ? (
          <Card title="References">
            <ul className="space-y-2 text-sm text-gray-700">
              {refs.map((r) => (
                <li key={r.url}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-gray-900 underline decoration-gray-300 hover:decoration-gray-500"
                  >
                    {r.title}
                  </a>
                  <p className="mt-0.5 break-all text-xs text-gray-500">{r.url}</p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    );
  }

  if (activeTab === "protocol") {
    const structured = results.protocolStructured;
    if (structured && structured.length > 0) {
      return (
        <div className="space-y-4">
          {structured.map((step) => (
            <Card key={step.step_number} title={`Step ${step.step_number}`}>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <span className="font-semibold text-gray-900">Action: </span>
                  {step.action}
                </p>
                <div>
                  <p className="font-semibold text-gray-900">Inputs</p>
                  <ul className="mt-1 list-disc pl-5">
                    {step.inputs.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  <p className="font-semibold text-gray-900">Conditions</p>
                  <ul className="mt-1 space-y-0.5">
                    {step.conditions.time ? <li>Time: {step.conditions.time}</li> : null}
                    {step.conditions.temperature ? (
                      <li>Temperature: {step.conditions.temperature}</li>
                    ) : null}
                    {step.conditions.concentration ? (
                      <li>Concentration: {step.conditions.concentration}</li>
                    ) : null}
                    {step.conditions.other ? <li>Other: {step.conditions.other}</li> : null}
                  </ul>
                </div>
                <p>
                  <span className="font-semibold text-gray-900">Output: </span>
                  {step.output}
                </p>
              </div>
            </Card>
          ))}
        </div>
      );
    }
    return (
      <Card title="Protocol Steps">
        <ol className="space-y-3 text-sm leading-6 text-gray-700">
          {results.protocolSteps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Card>
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
              Total (from model): {results.totalCost}
            </p>
          ) : null}
        </Card>
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
    return (
      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Timeline (phases)">
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
              Total duration: {results.timelineTotalDuration}
            </p>
          ) : null}
        </Card>
        <Card title="Dependencies & staffing">
          {results.timelineDependencies && results.timelineDependencies.length > 0 ? (
            <ul className="list-disc pl-5 text-sm text-gray-700">
              {results.timelineDependencies.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">
              Dependencies appear here when the pipeline provides them. Staffing is derived from
              phase workload in future versions.
            </p>
          )}
        </Card>
      </section>
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
