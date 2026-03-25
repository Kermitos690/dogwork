import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, PawPrint, Grid3X3, BarChart3, Settings } from "lucide-react";

const tabs = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/shelter" },
  { label: "Animaux", icon: PawPrint, path: "/shelter/animals" },
  { label: "Espaces", icon: Grid3X3, path: "/shelter/spaces" },
  { label: "Stats", icon: BarChart3, path: "/shelter/stats" },
  { label: "Paramètres", icon: Settings, path: "/shelter/settings" },
];

export function ShelterNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/shelter") return location.pathname === "/shelter";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] transition-colors ${
                active ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              <tab.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
