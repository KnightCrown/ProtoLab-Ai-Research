"use client";

import { useState } from "react";
import { Card } from "@/components/common/Card";
import { DataTable } from "@/components/common/DataTable";
import { InputSection } from "@/components/input/InputSection";
import { Sidebar } from "@/components/layout/Sidebar";
import { ResearchTabs } from "@/components/navigation/ResearchTabs";
import {
  TabId,
  materials,
  navItems,
  overviewData,
  protocolSteps,
  staffing,
  timeline,
  totalCost,
  trustScore,
} from "@/lib/mockData";

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

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [hypothesis, setHypothesis] = useState(
    "Editing drought-response genes in tomatoes improves water-use efficiency without reducing growth."
  );

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar navItems={navItems} activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <InputSection
            hypothesis={hypothesis}
            onHypothesisChange={setHypothesis}
          />

          <ResearchTabs tabs={navItems} activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === "overview" ? (
            <section className="grid gap-4 md:grid-cols-2">
              <Card title="Novelty Status">
                <p className="text-lg font-semibold text-gray-900">
                  {overviewData.noveltyStatus}
                </p>
              </Card>
              <Card title="Summary">
                <p className="text-sm leading-6 text-gray-700">{overviewData.summary}</p>
              </Card>
            </section>
          ) : null}

          {activeTab === "protocol" ? (
            <Card title="Protocol Steps">
              <ol className="space-y-3 text-sm leading-6 text-gray-700">
                {protocolSteps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          {activeTab === "materials" ? (
            <Card title="Materials & Cost">
              <DataTable
                columns={[
                  { header: "Item", key: "item" },
                  { header: "Supplier", key: "supplier" },
                  { header: "Cost", key: "cost", align: "right" },
                ]}
                rows={materials}
              />
              <p className="mt-4 text-right text-sm font-semibold text-gray-900">
                Total Cost: {totalCost}
              </p>
            </Card>
          ) : null}

          {activeTab === "timeline" ? (
            <section className="grid gap-4 md:grid-cols-2">
              <Card title="Timeline">
                <ul className="space-y-2 text-sm text-gray-700">
                  {timeline.map((entry) => (
                    <li key={entry} className="rounded-lg bg-gray-50 px-3 py-2">
                      {entry}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title="Staffing">
                <ul className="space-y-2 text-sm text-gray-700">
                  {staffing.map((member) => (
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
          ) : null}

          {activeTab === "trust" ? (
            <Card title="Trust Score">
              <div className="mb-5 inline-flex rounded-xl bg-gray-900 px-4 py-3 text-2xl font-bold text-white">
                {trustScore.score}/100
              </div>
              <ul className="space-y-3">
                {trustScore.issues.map((issue) => (
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
          ) : null}
        </div>
      </main>
    </div>
  );
}
