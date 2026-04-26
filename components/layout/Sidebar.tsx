import type { Experiment } from "@/lib/experimentModel";

type SidebarProps = {
  experiments: Experiment[];
  selectedExperimentId: string | null;
  onNewExperiment: () => void;
  onSelectExperiment: (id: string) => void;
};

export function Sidebar({
  experiments,
  selectedExperimentId,
  onNewExperiment,
  onSelectExperiment,
}: SidebarProps) {
  return (
    <aside className="flex h-screen w-[250px] flex-col justify-between border-r border-[#d9d4c3] bg-[#f3efe3] px-4 py-6">
      <div className="min-h-0 flex-1">
        <div className="mb-4">
          <h1 className="text-xl font-semibold tracking-tight text-[#4a5143]">ProtoLab AI</h1>
          <button
            type="button"
            onClick={onNewExperiment}
            className="mt-4 w-full rounded-lg bg-[#7f8572] px-4 py-2 text-sm font-medium text-[#f8f7f1] transition hover:bg-[#707761]"
          >
            + New Experiment
          </button>
        </div>

        {experiments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#d2ccbb] bg-[#fcfaf2] px-3 py-3 text-left">
            <p className="text-sm font-medium text-[#51584b]">No experiments yet</p>
            <p className="mt-1 text-sm leading-5 text-[#818776]">Click + New Experiment to start</p>
          </div>
        ) : (
          <div className="pr-0.5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#a19c8a]">Experiments</p>
            <ul className="max-h-[calc(100vh-220px)] space-y-0.5 overflow-y-auto pr-0.5">
              {experiments.map((exp) => {
                const isSelected = exp.id === selectedExperimentId;

                return (
                  <li key={exp.id}>
                    <button
                      type="button"
                      onClick={() => onSelectExperiment(exp.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-[#e8e4d6] font-medium text-[#4d5445]"
                          : "text-[#676e60] hover:bg-[#efebdd] hover:text-[#4b5242]"
                      }`}
                    >
                      {exp.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        className="mt-4 rounded-lg px-3 py-2 text-left text-sm text-[#676e60] transition hover:bg-[#efebdd] hover:text-[#4b5242]"
      >
        Settings
      </button>
    </aside>
  );
}
