import { Outlet, NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "首页" },
  { to: "/shelf", label: "书架" },
  { to: "/sources", label: "书源" },
];

export default function Layout() {
  return (
    <div className="min-h-full bg-[#fafafa]">
      {/* Desktop nav */}
      <header className="hidden md:block sticky top-0 z-30 bg-[#fafafa]/80 backdrop-blur-md border-b border-black/[0.04]">
        <div className="max-w-app mx-auto px-6 h-12 flex items-center justify-between">
          <span className="text-[15px] font-semibold tracking-tight text-[#1d1d1f]">
            Reader
          </span>
          <nav className="flex items-center gap-6">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `text-[13px] font-medium transition-colors ${
                    isActive
                      ? "text-[#1d1d1f]"
                      : "text-[#86868b] hover:text-[#1d1d1f]"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="pb-20 md:pb-6">
        <div className="max-w-app mx-auto px-4 md:px-6 pt-5 md:pt-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#fafafa]/90 backdrop-blur-md border-t border-black/[0.06]">
        <div className="flex items-center justify-around h-[52px] max-w-sm mx-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-0.5 px-5 py-1 ${
                  isActive ? "text-[#1d1d1f]" : "text-[#86868b]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-1 w-1 h-1 rounded-full bg-[#c45d35]" />
                  )}
                  <span className="text-[11px] font-medium mt-1">{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
