import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Dog, FileText, BarChart3, BookOpen, CreditCard, Building2 } from "lucide-react";

const tabs = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/coach" },
  { label: "Clients", icon: Users, path: "/coach/clients" },
  { label: "Chiens", icon: Dog, path: "/coach/dogs" },
  { label: "Refuges", icon: Building2, path: "/coach/shelter-animals" },
  { label: "Cours", icon: BookOpen, path: "/coach/courses" },
  { label: "Notes", icon: FileText, path: "/coach/notes" },
  { label: "Stats", icon: BarChart3, path: "/coach/stats" },
];

export function CoachNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/coach") return location.pathname === "/coach";
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
