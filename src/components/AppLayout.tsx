import { useLocation, useNavigate } from "react-router-dom";
import { Home, Dog, BookOpen, Play, BarChart3, ClipboardList, User } from "lucide-react";
import { useActiveDog } from "@/hooks/useDogs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { SlideMenu } from "@/components/SlideMenu";
import { FloatingReadAloud } from "@/components/FloatingReadAloud";

const tabs = [
  { label: "Accueil", icon: Home, path: "/" },
  { label: "Chiens", icon: Dog, path: "/dogs" },
  { label: "Go", icon: Play, path: "/training", center: true },
  { label: "Plan", icon: BookOpen, path: "/plan" },
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
    if (tab.path === "/training") return `/training/${currentDay}?source=plan`;
    return tab.path;
  };

  const hideNav = location.pathname === "/onboarding";

  return (
    <div className="min-h-screen bg-background pb-20">
      <SlideMenu />
      <FloatingReadAloud />
      <div className="mx-auto max-w-lg px-4">
        {children}
      </div>
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/70 glass safe-bottom border-t border-border/30">
          <div className="mx-auto flex max-w-lg items-center justify-around py-1">
            {tabs.map((tab) => {
              const active = isActive(tab.path);
              return (
                <motion.button
                  key={tab.path}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => navigate(getPath(tab))}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] transition-colors duration-200 ${
                    active ? "text-primary" : "text-muted-foreground"
                  } ${tab.center ? "relative" : ""}`}
                >
                  {tab.center ? (
                    <div className={`w-12 h-12 -mt-6 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                      active
                        ? "bg-primary neon-glow"
                        : "bg-card border border-border/60"
                    }`}>
                      <tab.icon className={`h-5 w-5 ${active ? "text-primary-foreground" : "text-primary"}`} />
                    </div>
                  ) : (
                    <tab.icon className={`h-5 w-5 transition-colors ${active ? "text-primary" : ""}`} />
                  )}
                  <span className={`${tab.center ? "mt-0.5" : ""} ${active ? "font-medium" : ""}`}>{tab.label}</span>
                </motion.button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
