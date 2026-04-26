"use client";

import { useMemo, useState } from "react";
import { InputSection } from "@/components/input/InputSection";
import { Sidebar } from "@/components/layout/Sidebar";
import { ResearchTabs } from "@/components/navigation/ResearchTabs";
import { ExperimentTabContent } from "@/components/tabs/ExperimentTabContent";
import type { Experiment } from "@/lib/experimentModel";
import { mapPlanToResults } from "@/lib/mapPlanToResults";
import type { PipelineResult } from "@/lib/pipeline/types";
import { navItems, TabId } from "@/lib/mockData";

const LOADING_PHASES = [
  "1/10 Analyzing hypothesis…",
  "2/10 Literature & novelty…",
  "3/10 Planning required protocols…",
  "4/10 Generating each protocol (SOP)…",
  "5/10 Extracting materials from protocols…",
  "6/10 Researching suppliers & prices (Tavily)…",
  "7/10 Building cost model…",
  "8/10 Timeline & step durations (Tavily assist)…",
  "9/10 Estimating staffing…",
  "10/10 Defining validation…",
] as const;

function newId(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `exp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getErrorMessage(payload: unknown, res: Response): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const e = (payload as { error: unknown }).error;
    if (typeof e === "string" && e.trim()) return e;
  }
  return `Request failed (${res.status}). Please try again.`;
}

type GeneratePlanResponse = { plan: PipelineResult };

export default function Home() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState(0);

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
    setAnalysisError(null);
    const n = experiments.length + 1;
    const id = newId();
    const newExperiment: Experiment = {
      id,
      name: `Experiment ${n}`,
      hypothesis: "",
      results: null,
      fullPlan: undefined,
    };
    setExperiments((list) => [...list, newExperiment]);
    setSelectedExperimentId(id);
  };

  const handleSelectExperiment = (id: string) => {
    setSelectedExperimentId(id);
    setAnalysisError(null);
  };

  const handleHypothesisChange = (value: string) => {
    if (selectedIdResolved == null) return;
    setAnalysisError(null);
    setExperiments((list) =>
      list.map((e) => (e.id === selectedIdResolved ? { ...e, hypothesis: value } : e))
    );
  };

  const handleGenerate = async () => {
    if (selectedIdResolved == null) return;
    setAnalysisError(null);
    setLoadingPhase(0);
    setIsAnalyzing(true);
    const progressTimer = setInterval(() => {
      setLoadingPhase((i) => Math.min(i + 1, LOADING_PHASES.length - 1));
    }, 2000);
    const hypothesis = selected?.hypothesis?.trim() || "";
    if (!hypothesis) {
      setAnalysisError("Enter a hypothesis first.");
      clearInterval(progressTimer);
      setIsAnalyzing(false);
      setLoadingPhase(0);
      return;
    }
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hypothesis }),
      });
      const payload: unknown = await res.json();
      if (!res.ok) {
        throw new Error(getErrorMessage(payload, res));
      }
      if (!payload || typeof payload !== "object" || !("plan" in payload)) {
        throw new Error("The server returned an invalid response. Please try again.");
      }
      const data = payload as GeneratePlanResponse;
      if (!data.plan) {
        throw new Error("The server returned an empty plan.");
      }
      const nextResults = mapPlanToResults(data.plan);
      setExperiments((list) =>
        list.map((e) =>
          e.id === selectedIdResolved
            ? { ...e, results: nextResults, fullPlan: data.plan }
            : e
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setAnalysisError(message);
    } finally {
      clearInterval(progressTimer);
      setIsAnalyzing(false);
      setLoadingPhase(0);
    }
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
              isLoading={isAnalyzing}
              loadingMessage={LOADING_PHASES[Math.min(loadingPhase, LOADING_PHASES.length - 1)]}
              errorMessage={analysisError}
            />

            <ResearchTabs tabs={navItems} activeTab={activeTab} onChange={setActiveTab} />

            <ExperimentTabContent activeTab={activeTab} results={selected?.results ?? null} />
          </div>
        )}
      </main>
    </div>
  );
}
