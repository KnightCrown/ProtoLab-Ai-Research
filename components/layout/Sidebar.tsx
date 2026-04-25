import { NavItem, TabId } from "@/lib/mockData";

type SidebarProps = {
  navItems: NavItem[];
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
};

export function Sidebar({ navItems, activeTab, onSelectTab }: SidebarProps) {
  return (
    <aside className="flex h-screen w-[250px] flex-col justify-between border-r border-gray-200 bg-white px-4 py-6">
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">ProtoLab AI</h1>
          <button className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700">
            + New Experiment
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.id === activeTab;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  isActive
                    ? "bg-gray-100 font-medium text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <button className="rounded-lg px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900">
        Settings
      </button>
    </aside>
  );
}
