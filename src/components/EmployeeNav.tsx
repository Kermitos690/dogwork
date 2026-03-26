import { useLocation, useNavigate } from "react-router-dom";
import { Home, PawPrint, ClipboardList, User } from "lucide-react";

const tabs = [
  { label: "Accueil", icon: Home, path: "/employee" },
  { label: "Animaux", icon: PawPrint, path: "/employee/animals" },
  { label: "Activités", icon: ClipboardList, path: "/employee/activity" },
  { label: "Profil", icon: User, path: "/employee/profile" },
];

export function EmployeeNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="mx-auto max-w-lg flex justify-around py-2 px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
