import type { Experiment } from "@/lib/experimentModel";

type SidebarProps = {
  experiments: Experiment[];
  selectedExperimentId: string | null;
  onNewExperiment: () => void;
  onSelectExperiment: (id: string) => void;
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
};

export function Sidebar({
  experiments,
  selectedExperimentId,
  onNewExperiment,
  onSelectExperiment,
  isOpen,
  isMobile,
  onClose,
}: SidebarProps) {
  // On desktop the sidebar is always in the flex flow (relative).
  // On mobile it is a fixed overlay drawer that slides in from the left.
  const positionClass = isMobile
    ? "fixed inset-y-0 left-0 z-50"
    : "relative shrink-0";

  return (
    <aside
      className={`${positionClass} flex h-screen w-[260px] flex-col justify-between border-r border-[#d9d4c3] bg-[#f3efe3] px-4 py-6 ${
        isMobile ? "sidebar-drawer-enter" : ""
      }`}
    >
      <div className="min-h-0 flex-1">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight text-[#4a5143]">ProtoLab AI</h1>
            {isMobile && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#676e60] transition hover:bg-[#efebdd]"
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
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
                      onClick={() => {
                        onSelectExperiment(exp.id);
                        if (isMobile) onClose();
                      }}
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
