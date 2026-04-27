"use client";

import { useEffect, useMemo, useState } from "react";
import { InputSection } from "@/components/input/InputSection";
import { Sidebar } from "@/components/layout/Sidebar";
import { ResearchTabs } from "@/components/navigation/ResearchTabs";
import { ExperimentTabContent } from "@/components/tabs/ExperimentTabContent";
import type { Experiment } from "@/lib/experimentModel";
import { exportExperimentToPdf } from "@/lib/exportExperimentPdf";
import { mapPlanToResults } from "@/lib/mapPlanToResults";
import type { PipelineResult } from "@/lib/pipeline/types";
import { navItems, TabId } from "@/lib/mockData";

const LOADING_PHASES = [
  "1/11 Analyzing hypothesis…",
  "2/11 Literature & novelty…",
  "3/11 Planning required protocols…",
  "4/11 Generating each protocol (SOP)…",
  "5/11 Extracting materials from protocols…",
  "6/11 Researching suppliers & prices (Tavily)…",
  "7/11 Building cost model…",
  "8/11 Timeline & step durations (Tavily assist)…",
  "9/11 Estimating staffing…",
  "10/11 Defining validation…",
  "11/11 Computing trust score…",
] as const;

const DEFAULT_HYPOTHESIS =
  "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls, measured by FITC-dextran assay, due to upregulation of tight junction proteins claudin-1 and occludin.";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // True when viewport < 768px (md breakpoint). Starts false to avoid layout
  // shift on desktop during hydration; useEffect corrects it immediately.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setSidebarOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
      hypothesis: DEFAULT_HYPOTHESIS,
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

  const handleExportPdf = () => {
    if (selected == null || !selected.results) return;
    try {
      exportExperimentToPdf({
        name: selected.name,
        hypothesis: selected.hypothesis,
        results: selected.results,
      });
    } catch (e) {
      console.error(e);
    }
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
      const res = await fetch("/api/analyze", {
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
    <div className="flex h-screen overflow-hidden bg-[#f6f2e6] text-[#3f4539]">
      {/* Mobile backdrop overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: always visible on desktop; drawer on mobile */}
      {(!isMobile || sidebarOpen) && (
        <Sidebar
          experiments={experiments}
          selectedExperimentId={selectedIdResolved}
          onNewExperiment={() => {
            handleNewExperiment();
            if (isMobile) setSidebarOpen(false);
          }}
          onSelectExperiment={handleSelectExperiment}
          isOpen={sidebarOpen}
          isMobile={isMobile}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 md:px-8 md:py-8">
        {/* Mobile top bar */}
        {isMobile && (
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9d4c3] bg-[#f3efe3] text-[#676e60] transition hover:bg-[#efebdd]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="text-base font-semibold tracking-tight text-[#4a5143]">ProtoLab AI</span>
          </div>
        )}

        {!hasExperiments ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-md px-4 text-center">
              <p className="text-lg font-medium text-[#485041]">Create a new experiment to begin</p>
              <p className="mt-2 text-sm text-[#7e846f]">
                {isMobile ? (
                  <>
                    Tap the{" "}
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(true)}
                      className="underline decoration-dotted underline-offset-2 hover:text-[#4a5143]"
                    >
                      menu
                    </button>{" "}
                    to add your first experiment.
                  </>
                ) : (
                  "Use the sidebar to add your first experiment."
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 sm:gap-6">
            <InputSection
              hypothesis={selected?.hypothesis ?? ""}
              onHypothesisChange={handleHypothesisChange}
              onGenerate={handleGenerate}
              disabled={!selected}
              isLoading={isAnalyzing}
              loadingMessage={LOADING_PHASES[Math.min(loadingPhase, LOADING_PHASES.length - 1)]}
              errorMessage={analysisError}
            />

            {selected?.results ? (
              <>
                <ResearchTabs
                  tabs={navItems}
                  activeTab={activeTab}
                  onChange={setActiveTab}
                  rightAction={
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      className="inline-flex w-full items-center justify-center rounded-md border border-[#c9c5b4] bg-[#7f8572] px-3 py-2 text-sm font-medium text-[#f7f6ef] shadow-sm transition hover:bg-[#6f7663] sm:w-auto"
                    >
                      Export as PDF
                    </button>
                  }
                />
                <ExperimentTabContent activeTab={activeTab} results={selected.results} />
              </>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
