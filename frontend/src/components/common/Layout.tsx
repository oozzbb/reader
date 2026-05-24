import { Outlet, NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "首页", icon: "🏠" },
  { to: "/sources", label: "书源", icon: "📚" },
];

export default function Layout() {
  return (
    <div className="min-h-full flex flex-col">
      {/* Top bar - desktop */}
      <header className="hidden md:flex items-center px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-surface dark:bg-surface-dark">
        <h1 className="text-lg font-bold text-primary">Reader</h1>
        <nav className="ml-8 flex gap-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-gray-600 dark:text-gray-400 hover:text-primary"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom nav - mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface dark:bg-surface-dark border-t border-gray-200 dark:border-gray-700 flex justify-around py-2 safe-bottom">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center text-xs ${
                isActive ? "text-primary" : "text-gray-500"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
