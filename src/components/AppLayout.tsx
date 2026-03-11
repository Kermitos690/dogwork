import { useLocation, useNavigate } from "react-router-dom";
import { Home, Dog, BookOpen, Play, ClipboardList, BarChart3, User } from "lucide-react";
import { useActiveDog } from "@/hooks/useDogs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { label: "Accueil", icon: Home, path: "/" },
  { label: "Plan", icon: BookOpen, path: "/plan" },
  { label: "Entraînement", icon: Play, path: "/training", center: true },
  { label: "Journal", icon: ClipboardList, path: "/journal" },
  { label: "Stats", icon: BarChart3, path: "/stats" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeDog = useActiveDog();

  const { data: progress } = useQuery({
    queryKey: ["day_progress_nav", activeDog?.id],
    queryFn: async () => {
      const { data } = await supabase.from("day_progress").select("day_id, validated, status").eq("dog_id", activeDog!.id);
      return data || [];
    },
    enabled: !!activeDog,
    staleTime: 30000,
  });

  const validated = progress?.filter(p => p.validated).length || 0;
  const currentDay = validated + 1;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const getPath = (tab: typeof tabs[number]) => {
    if (tab.path === "/training") return `/training/${currentDay}`;
    return tab.path;
  };

  // Hide nav on onboarding
  const hideNav = location.pathname === "/onboarding";

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-lg px-4">
        {children}
      </div>
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 glass safe-bottom">
          <div className="mx-auto flex max-w-lg items-center justify-around py-1.5">
            {tabs.map((tab) => {
              const active = isActive(tab.path);
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(getPath(tab))}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-all duration-200 ${
                    active ? "text-primary font-semibold" : "text-muted-foreground"
                  } ${tab.center ? "relative" : ""}`}
                >
                  {tab.center ? (
                    <div className={`w-11 h-11 -mt-4 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${
                      active ? "bg-primary" : "bg-card border border-border"
                    }`}>
                      <tab.icon className={`h-5 w-5 ${active ? "text-primary-foreground" : "text-primary"}`} />
                    </div>
                  ) : (
                    <tab.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                  )}
                  <span className={tab.center ? "mt-0.5" : ""}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
