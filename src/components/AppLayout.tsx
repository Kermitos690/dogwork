import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, BookOpen, Play, Dumbbell, User } from "lucide-react";
import { useActiveDog } from "@/hooks/useDogs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { SlideMenu } from "@/components/SlideMenu";
import { FloatingReadAloud } from "@/components/FloatingReadAloud";
import { DogSwitcher } from "@/components/DogSwitcher";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeDog = useActiveDog();
  const { t } = useTranslation();

  // Mobile-first navigation: 5 onglets utiles au quotidien.
  // - Accueil : tableau de bord du jour
  // - Plan : vue programme complet
  // - GO (centre) : démarre/continue le jour en cours
  // - Exercices : bibliothèque accessible pendant l'entraînement
  // - Profil : compte + raccourci menu complet
  const tabs = [
    { label: t("nav.home"), icon: Home, path: "/" },
    { label: t("nav.plan"), icon: BookOpen, path: "/plan" },
    { label: "GO", icon: Play, path: "/training", center: true },
    { label: t("nav.exercises"), icon: Dumbbell, path: "/exercises" },
    { label: t("nav.profile"), icon: User, path: "/profile" },
  ];

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
  // Indique qu'une journée est en cours (non validée mais entamée).
  const hasOngoingDay = !!progress?.some(p => p.status === "in_progress" && !p.validated);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const getPath = (tab: typeof tabs[number]) => {
    if (tab.path === "/training") return `/training/${currentDay}?source=plan`;
    return tab.path;
  };

  // Pages qui doivent masquer la nav globale (mode focus immersif).
  // /training/session/:dayId rend sa propre barre d'action en bas.
  const hideNav =
    location.pathname === "/onboarding" ||
    location.pathname.startsWith("/training/session/");

  // The Dashboard already renders its own DogSwitcher in-page → avoid a duplicate at the top.
  const showTopDogSwitcher = !hideNav && !!activeDog && location.pathname !== "/";

  return (
    <div className="min-h-screen bg-background pb-20">
      <SlideMenu />
      <FloatingReadAloud />
      {showTopDogSwitcher && (
        <div className="fixed top-3 right-3 z-40">
          <DogSwitcher />
        </div>
      )}
      <div className="mx-auto max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 pt-16">
        {children}
      </div>
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/70 glass safe-bottom border-t border-border/30">
          <div className="mx-auto grid grid-cols-5 max-w-lg md:max-w-2xl items-end py-1">
            {tabs.map((tab) => {
              const active = isActive(tab.path);
              return (
                <motion.button
                  key={tab.path}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => navigate(getPath(tab))}
                  className={`flex flex-col items-center gap-0.5 px-1 py-1.5 text-[10px] transition-colors duration-200 min-w-0 ${
                    active ? "text-primary" : "text-muted-foreground"
                  } ${tab.center ? "relative" : ""}`}
                  aria-label={tab.label}
                >
                  {tab.center ? (
                    <div className={`relative w-12 h-12 -mt-6 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                      active
                        ? "bg-primary neon-glow"
                        : "bg-card border border-border/60"
                    }`}>
                      <tab.icon className={`h-5 w-5 ${active ? "text-primary-foreground" : "text-primary"}`} />
                      {/* Pastille indiquant la journée en cours / à démarrer */}
                      {activeDog && (
                        <span
                          className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-[16px] px-1 rounded-full text-[9px] font-bold leading-[16px] text-center shadow-md ring-2 ring-background ${
                            hasOngoingDay
                              ? "bg-warning text-warning-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                          aria-label={`Jour ${currentDay}`}
                        >
                          J{currentDay}
                        </span>
                      )}
                    </div>
                  ) : (
                    <tab.icon className={`h-5 w-5 transition-colors ${active ? "text-primary" : ""}`} />
                  )}
                  <span className={`truncate max-w-full ${tab.center ? "mt-0.5" : ""} ${active ? "font-medium" : ""}`}>{tab.label}</span>
                </motion.button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
