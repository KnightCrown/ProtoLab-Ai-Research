import type { ReactNode } from "react";
import { NavItem, TabId } from "@/lib/mockData";

type ResearchTabsProps = {
  tabs: NavItem[];
  activeTab: TabId;
  onChange: (tab: TabId) => void;
  rightAction?: ReactNode;
};

export function ResearchTabs({ tabs, activeTab, onChange, rightAction }: ResearchTabsProps) {
  return (
    <div className="rounded-xl border border-[#d6d2c1] bg-[#fffdf6] p-2 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`rounded-md px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-[#7f8572] font-medium text-[#f7f6ef]"
                    : "text-[#6a705f] hover:bg-[#eeebde] hover:text-[#4f5648]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {rightAction != null ? (
          <div className="flex w-full shrink-0 justify-end sm:w-auto sm:pl-1">{rightAction}</div>
        ) : null}
      </div>
    </div>
  );
}
