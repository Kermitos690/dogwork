import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePreferences } from "@/hooks/usePreferences";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  Menu, Home, Dog, BookOpen, Play, BarChart3, ClipboardList,
  Calendar, User, HelpCircle, CreditCard, GraduationCap, Shield,
  MessageSquare, FileText, Users, LayoutDashboard, CalendarDays,
  Target, AlertTriangle, Dumbbell, LogOut, Settings, Star, X
} from "lucide-react";
import { motion } from "framer-motion";
import { NotificationBell } from "@/components/NotificationBell";

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export function SlideMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { preferences } = usePreferences();
  const { t } = useTranslation();

  const { data: roles } = useQuery({
    queryKey: ["user-roles-menu", user?.id],
    queryFn: async () => {
      const [{ data: admin }, { data: educator }, { data: shelter }] = await Promise.all([
        supabase.rpc("is_admin"),
        supabase.rpc("is_educator"),
        supabase.rpc("is_shelter" as any),
      ]);
      return { isAdmin: admin === true, isEducator: educator === true, isShelter: shelter === true };
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-messages", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user!.id)
        .eq("read", false);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const isAdmin = roles?.isAdmin ?? false;
  const isEducator = roles?.isEducator ?? false;
  const isShelter = roles?.isShelter ?? false;

  const userSections: MenuSection[] = [
    {
      title: t("menu.main"),
      items: [
        { label: t("nav.home"), icon: Home, path: "/" },
        { label: t("nav.dogs"), icon: Dog, path: "/dogs" },
        { label: t("nav.training"), icon: Play, path: "/training" },
        { label: t("nav.plan"), icon: BookOpen, path: "/plan" },
      ],
    },
    {
      title: t("menu.tracking"),
      items: [
        { label: t("nav.journal"), icon: ClipboardList, path: "/journal" },
        { label: t("nav.stats"), icon: BarChart3, path: "/stats" },
        { label: t("nav.evaluation"), icon: Target, path: "/evaluation" },
        { label: t("nav.problems"), icon: AlertTriangle, path: "/problems" },
        { label: t("nav.objectives"), icon: Star, path: "/objectives" },
      ],
    },
    {
      title: t("menu.discover"),
      items: [
        { label: t("nav.exercises"), icon: Dumbbell, path: "/exercises" },
        { label: t("nav.courses"), icon: GraduationCap, path: "/courses" },
        { label: t("nav.safety"), icon: Shield, path: "/safety" },
      ],
    },
    {
      title: t("menu.communication"),
      items: [
        { label: t("nav.messages"), icon: MessageSquare, path: "/messages", badge: unreadCount },
      ],
    },
    {
      title: t("menu.account"),
      items: [
        { label: t("nav.profile"), icon: User, path: "/profile" },
        { label: t("nav.preferences"), icon: Settings, path: "/preferences" },
        { label: t("nav.subscription"), icon: CreditCard, path: "/subscription" },
        { label: t("nav.help"), icon: HelpCircle, path: "/help" },
      ],
    },
  ];

  const coachSections: MenuSection[] = [
    {
      title: t("menu.coachSpace"),
      items: [
        { label: t("menu.dashboardCoach"), icon: LayoutDashboard, path: "/coach" },
        { label: t("menu.myClients"), icon: Users, path: "/coach/clients" },
        { label: t("menu.followedDogs"), icon: Dog, path: "/coach/dogs" },
        { label: t("menu.myCourses"), icon: GraduationCap, path: "/coach/courses" },
        { label: t("menu.calendar"), icon: CalendarDays, path: "/coach/calendar" },
        { label: t("menu.notes"), icon: FileText, path: "/coach/notes" },
        { label: t("nav.stats"), icon: BarChart3, path: "/coach/stats" },
      ],
    },
  ];

  const adminSections: MenuSection[] = [
    {
      title: t("menu.admin"),
      items: [
        { label: t("menu.adminDashboard"), icon: Shield, path: "/admin" },
      ],
    },
  ];

  const shelterSections: MenuSection[] = [
    {
      title: t("menu.shelterSpace"),
      items: [
        { label: t("menu.shelterDashboard"), icon: LayoutDashboard, path: "/shelter" },
        { label: t("menu.animals"), icon: Dog, path: "/shelter/animals" },
      ],
    },
  ];

  const sectionPathMap: Record<string, string[]> = {
    journal: ["/journal"],
    stats: ["/stats"],
    exercises: ["/exercises"],
    courses: ["/courses"],
    safety: ["/safety"],
    messages: ["/messages"],
  };

  const hiddenPaths = new Set<string>();
  Object.entries(sectionPathMap).forEach(([key, paths]) => {
    if (!preferences.visible_sections.includes(key)) {
      paths.forEach((p) => hiddenPaths.add(p));
    }
  });

  const filteredUserSections = userSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !hiddenPaths.has(item.path)),
    }))
    .filter((section) => section.items.length > 0);

  const allSections = [
    ...filteredUserSections,
    ...(isEducator ? coachSections : []),
    ...(isShelter ? shelterSections : []),
    ...(isAdmin ? adminSections : []),
  ];

  const handleNav = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleSignOut = () => {
    setOpen(false);
    signOut();
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="fixed top-4 left-4 z-[60] w-10 h-10 rounded-xl bg-card/80 backdrop-blur-md border border-border/40 flex items-center justify-center text-foreground shadow-lg hover:bg-card transition-colors"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      {/* Notification bell next to menu */}
      <div className="fixed top-4 right-4 z-[60]">
        <NotificationBell />
      </div>
      <SheetContent side="left" className="w-[300px] p-0 bg-card border-r border-border/40">
        {/* Header */}
        <div className="p-5 pb-3 border-b border-border/30">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground tracking-tight">DogWork</h2>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.user_metadata?.display_name || user?.email?.split("@")[0]}
              </p>
              <div className="flex gap-1 mt-0.5">
                {isAdmin && <Badge className="text-[9px] px-1.5 py-0 bg-amber-600 text-white border-0">Admin</Badge>}
                {isEducator && <Badge className="text-[9px] px-1.5 py-0 bg-emerald-600 text-white border-0">{t("menu.educator")}</Badge>}
                {isShelter && <Badge className="text-[9px] px-1.5 py-0 bg-violet-600 text-white border-0">{t("menu.shelter")}</Badge>}
                {!isAdmin && !isEducator && !isShelter && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{t("menu.user")}</Badge>}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 h-[calc(100vh-180px)]">
          <div className="py-2">
            {allSections.map((section) => {
              const isCoachSection = section.title === t("menu.coachSpace");
              const isAdminSection = section.title === t("menu.admin");
              const isShelterSection = section.title === t("menu.shelterSpace");
              const sectionColor = isCoachSection
                ? "text-emerald-400"
                : isAdminSection
                  ? "text-amber-400"
                  : isShelterSection
                    ? "text-violet-400"
                    : "text-muted-foreground";
              const accentHsl = isCoachSection
                ? "hsl(160 65% 45%)"
                : isAdminSection
                  ? "hsl(25 95% 55%)"
                  : isShelterSection
                    ? "hsl(270 70% 55%)"
                    : undefined;

              return (
                <div key={section.title} className="mb-1">
                  <p className={`px-5 py-2 text-[10px] font-semibold uppercase tracking-widest ${sectionColor}`}>
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const active = isActive(item.path);
                    const activeColor = accentHsl ?? "hsl(var(--primary))";
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNav(item.path)}
                        className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-all border-l-2 ${
                          active
                            ? "bg-primary/10"
                            : "text-foreground/80 hover:bg-muted/50 border-transparent"
                        }`}
                        style={active ? { color: activeColor, borderColor: activeColor } : undefined}
                      >
                        <item.icon
                          className="h-4 w-4 flex-shrink-0"
                          style={active ? { color: activeColor } : undefined}
                        />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && item.badge > 0 ? (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 min-w-[18px] justify-center">
                            {item.badge}
                          </Badge>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border/30 p-3 bg-card">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>{t("common.signOut")}</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
