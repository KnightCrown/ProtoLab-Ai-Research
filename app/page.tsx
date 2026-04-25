"use client";

import { useMemo, useState } from "react";
import { InputSection } from "@/components/input/InputSection";
import { Sidebar } from "@/components/layout/Sidebar";
import { ResearchTabs } from "@/components/navigation/ResearchTabs";
import { ExperimentTabContent } from "@/components/tabs/ExperimentTabContent";
import type { Experiment } from "@/lib/experimentModel";
import { generateMockResults } from "@/lib/generateMockResults";
import { navItems, TabId } from "@/lib/mockData";

function newId(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `exp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Home() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const selectedIdResolved = useMemo(() => {
    if (experiments.length === 0) return null;
    if (selectedExperimentId && experiments.some((e) => e.id === selectedExperimentId)) {
      return selectedExperimentId;
    }
    return experiments[0]!.id;
  }, [experiments, selectedExperimentId]);

  const selected = useMemo(
    () =>
      selectedIdResolved == null
        ? null
        : (experiments.find((e) => e.id === selectedIdResolved) ?? null),
    [experiments, selectedIdResolved]
  );

  const hasExperiments = experiments.length > 0;

  const handleNewExperiment = () => {
    const n = experiments.length + 1;
    const id = newId();
    const newExperiment: Experiment = {
      id,
      name: `Experiment ${n}`,
      hypothesis: "",
      results: null,
    };
    setExperiments((list) => [...list, newExperiment]);
    setSelectedExperimentId(id);
  };

  const handleSelectExperiment = (id: string) => {
    setSelectedExperimentId(id);
  };

  const handleHypothesisChange = (value: string) => {
    if (selectedIdResolved == null) return;
    setExperiments((list) =>
      list.map((e) => (e.id === selectedIdResolved ? { ...e, hypothesis: value } : e))
    );
  };

  const handleGenerate = () => {
    if (selectedIdResolved == null) return;
    setExperiments((list) =>
      list.map((e) =>
        e.id === selectedIdResolved
          ? {
              ...e,
              results: generateMockResults({ name: e.name, hypothesis: e.hypothesis || e.name }),
            }
          : e
      )
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar
        experiments={experiments}
        selectedExperimentId={selectedIdResolved}
        onNewExperiment={handleNewExperiment}
        onSelectExperiment={handleSelectExperiment}
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-8">
        {!hasExperiments ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-md text-center">
              <p className="text-lg font-medium text-gray-900">Create a new experiment to begin</p>
              <p className="mt-2 text-sm text-gray-500">Use the sidebar to add your first experiment.</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
            <InputSection
              hypothesis={selected?.hypothesis ?? ""}
              onHypothesisChange={handleHypothesisChange}
              onGenerate={handleGenerate}
              disabled={!selected}
            />

            <ResearchTabs tabs={navItems} activeTab={activeTab} onChange={setActiveTab} />

            <ExperimentTabContent activeTab={activeTab} results={selected?.results ?? null} />
          </div>
        )}
      </main>
    </div>
  );
}
