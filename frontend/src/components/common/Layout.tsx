import { Outlet, NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "首页" },
  { to: "/shelf", label: "书架" },
  { to: "/sources", label: "书源" },
];

export default function Layout() {
  return (
    <div className="min-h-full flex flex-col bg-paper">
      {/* Desktop: minimal top bar */}
      <header className="hidden md:block border-b border-ink-faint/30">
        <div className="max-w-content mx-auto px-6 py-5 flex items-baseline justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-ink">Reader</h1>
          <nav className="flex gap-8">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-sm tracking-wide transition-colors ${
                    isActive ? "text-ink" : "text-ink-muted hover:text-ink-light"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Content area */}
      <main className="flex-1 pb-16 md:pb-0">
        <div className="max-w-content mx-auto px-5 md:px-6 py-8 md:py-12">
          <Outlet />
        </div>
      </main>

      {/* Mobile: bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-paper border-t border-ink-faint/30 safe-bottom">
        <div className="flex justify-around py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-xs tracking-widest uppercase transition-colors ${
                  isActive ? "text-ink font-medium" : "text-ink-muted"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
