import { Outlet, NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "首页" },
  { to: "/manga", label: "漫画" },
  { to: "/shelf", label: "书架" },
  { to: "/sources", label: "书源" },
];

export default function Layout() {
  return (
    <div className="min-h-full bg-[#fafafa]">
      {/* Desktop header */}
      <header className="hidden md:block sticky top-0 z-40 bg-[#fafafa]/85 backdrop-blur-xl border-b border-black/[0.04]">
        <div className="max-w-[960px] mx-auto px-8 h-14 flex items-center justify-between">
          <span className="text-[16px] font-bold tracking-tight text-[#1d1d1f]">Reader</span>
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? "text-[#1d1d1f] bg-black/[0.05]"
                      : "text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.03]"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="pb-[68px] md:pb-8">
        <div className="max-w-[960px] mx-auto px-4 md:px-8 pt-4 md:pt-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-black/[0.06]">
        <div className="flex items-stretch justify-around h-[52px]">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-[2px] transition-colors ${
                  isActive ? "text-[#1d1d1f]" : "text-[#c7c7cc]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`w-[5px] h-[5px] rounded-full transition-all duration-300 ${
                    isActive ? "bg-[#c45d35] scale-100" : "bg-transparent scale-0"
                  }`} />
                  <span className="text-[11px] font-medium">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
