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
    <aside className="flex h-screen w-[250px] flex-col justify-between border-r border-gray-200 bg-white px-4 py-6">
      <div className="min-h-0 flex-1">
        <div className="mb-4">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">ProtoLab AI</h1>
          <button
            type="button"
            onClick={onNewExperiment}
            className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
          >
            + New Experiment
          </button>
        </div>

        {experiments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-left">
            <p className="text-sm font-medium text-gray-800">No experiments yet</p>
            <p className="mt-1 text-sm leading-5 text-gray-500">Click + New Experiment to start</p>
          </div>
        ) : (
          <div className="pr-0.5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Experiments</p>
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
                          ? "bg-gray-100 font-medium text-gray-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
        className="mt-4 rounded-lg px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
      >
        Settings
      </button>
    </aside>
  );
}
