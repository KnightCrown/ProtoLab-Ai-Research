import { NavItem, TabId } from "@/lib/mockData";

type ResearchTabsProps = {
  tabs: NavItem[];
  activeTab: TabId;
  onChange: (tab: TabId) => void;
};

export function ResearchTabs({ tabs, activeTab, onChange }: ResearchTabsProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`rounded-md px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-gray-900 font-medium text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
