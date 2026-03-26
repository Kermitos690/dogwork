import { Home, PawPrint, ClipboardList, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";

export function EmployeeNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="mx-auto max-w-lg flex justify-around py-2 px-2">
        <NavLink to="/employee" icon={Home} label="Accueil" />
        <NavLink to="/employee/animals" icon={PawPrint} label="Animaux" />
        <NavLink to="/employee/activity" icon={ClipboardList} label="Activités" />
        <NavLink to="/employee/profile" icon={User} label="Profil" />
      </div>
    </nav>
  );
}
