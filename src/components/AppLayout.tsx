import { useLocation, useNavigate } from "react-router-dom";
import { Home, Dog, BookOpen, ClipboardList, BarChart3 } from "lucide-react";

const tabs = [
  { label: "Accueil", icon: Home, path: "/" },
  { label: "Chiens", icon: Dog, path: "/dogs" },
  { label: "Plan", icon: BookOpen, path: "/plan" },
  { label: "Journal", icon: ClipboardList, path: "/journal" },
  { label: "Stats", icon: BarChart3, path: "/stats" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-lg px-4">
        {children}
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom">
        <div className="mx-auto flex max-w-lg items-center justify-around py-2">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 text-xs transition-colors ${
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
    </div>
  );
}
