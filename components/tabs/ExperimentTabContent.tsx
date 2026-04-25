import { Card } from "@/components/common/Card";
import { DataTable } from "@/components/common/DataTable";
import type { ExperimentResults } from "@/lib/experimentModel";
import type { TabId } from "@/lib/mockData";

function TrustIssueBadge({ severity }: { severity: "low" | "medium" | "high" }) {
  const styles = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
  };

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[severity]}`}>
      {severity}
    </span>
  );
}

function NoResultsPanel() {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
      <p className="text-sm font-medium text-gray-900">No plan generated yet</p>
      <p className="mt-1 text-sm text-gray-500">
        Click <span className="font-medium">Generate Experiment Plan</span> to fill this tab with
        mock results.
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
    return (
      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Novelty Status">
          <p className="text-lg font-semibold text-gray-900">{results.overview.noveltyStatus}</p>
        </Card>
        <Card title="Summary">
          <p className="text-sm leading-6 text-gray-700">{results.overview.summary}</p>
        </Card>
      </section>
    );
  }

  if (activeTab === "protocol") {
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
    return (
      <Card title="Materials & Cost">
        <DataTable
          columns={[
            { header: "Item", key: "item" },
            { header: "Supplier", key: "supplier" },
            { header: "Cost", key: "cost", align: "right" },
          ]}
          rows={results.materials}
        />
        <p className="mt-4 text-right text-sm font-semibold text-gray-900">
          Total Cost: {results.totalCost}
        </p>
      </Card>
    );
  }

  if (activeTab === "timeline") {
    return (
      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Timeline">
          <ul className="space-y-2 text-sm text-gray-700">
            {results.timeline.map((entry) => (
              <li key={entry} className="rounded-lg bg-gray-50 px-3 py-2">
                {entry}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Staffing">
          <ul className="space-y-2 text-sm text-gray-700">
            {results.staffing.map((member) => (
              <li
                key={member.role}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <span>{member.role}</span>
                <span className="font-medium text-gray-900">{member.hours}h</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    );
  }

  if (activeTab === "trust") {
    return (
      <Card title="Trust Score">
        <div className="mb-5 inline-flex rounded-xl bg-gray-900 px-4 py-3 text-2xl font-bold text-white">
          {results.trustScore.score}/100
        </div>
        <ul className="space-y-3">
          {results.trustScore.issues.map((issue) => (
            <li
              key={issue.text}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
            >
              <span className="text-sm text-gray-700">{issue.text}</span>
              <TrustIssueBadge severity={issue.severity} />
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  return null;
}
