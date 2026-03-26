import { LayoutDashboard, PlusCircle, BarChart3, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useStrings } from "../hooks/useStrings";
import { cn } from "../lib/utils";

export default function BottomNav() {
  const STRINGS = useStrings();
  const navItems = [
    { to: "/", icon: LayoutDashboard, label: STRINGS.tabs.dashboard },
    { to: "/add", icon: PlusCircle, label: STRINGS.tabs.addEntry },
    { to: "/reports", icon: BarChart3, label: STRINGS.tabs.reports },
    { to: "/settings", icon: Settings, label: STRINGS.tabs.settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-variant border-t border-outline/20 pb-safe shadow-lg z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center w-full h-full transition-colors duration-200",
                isActive ? "text-primary" : "text-on-surface-variant hover:text-primary/70"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "p-1 rounded-full transition-all duration-200",
                    isActive && "bg-primary-container"
                  )}
                >
                  <Icon className={cn("w-6 h-6", isActive ? "text-on-primary-container" : "text-on-surface-variant")} />
                </div>
                <span className="text-[10px] font-medium mt-1">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
