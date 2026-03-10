import { useLocation, useNavigate } from "react-router-dom";
import { Home, Calendar, Play, ClipboardList, BarChart3 } from "lucide-react";
import { getSettings } from "@/lib/storage";

const tabs = [
  { label: "Accueil", icon: Home, path: "/" },
  { label: "Programme", icon: Calendar, path: "/program" },
  { label: "Entraînement", icon: Play, path: "/training", dynamic: true },
  { label: "Suivi", icon: ClipboardList, path: "/behavior", dynamic: true },
  { label: "Stats", icon: BarChart3, path: "/stats" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentDay = getSettings().currentDay;

  const getPath = (tab: typeof tabs[0]) => {
    if (tab.dynamic) return `${tab.path}/${currentDay}`;
    return tab.path;
  };

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.path === "/") return location.pathname === "/";
    return location.pathname.startsWith(tab.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <button
              key={tab.label}
              onClick={() => navigate(getPath(tab))}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors ${
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
