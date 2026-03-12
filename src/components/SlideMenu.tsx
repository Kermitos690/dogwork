import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Menu, Home, Dog, BookOpen, Play, BarChart3, ClipboardList,
  Calendar, User, HelpCircle, CreditCard, GraduationCap, Shield,
  MessageSquare, FileText, Users, LayoutDashboard, CalendarDays,
  Target, AlertTriangle, Dumbbell, LogOut, Settings, Star, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  // Fetch roles
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

  // Unread messages count
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

  const userSections: MenuSection[] = [
    {
      title: "Principal",
      items: [
        { label: "Tableau de bord", icon: Home, path: "/" },
        { label: "Mes chiens", icon: Dog, path: "/dogs" },
        { label: "Entraînement", icon: Play, path: "/training" },
        { label: "Mon plan", icon: BookOpen, path: "/plan" },
      ],
    },
    {
      title: "Suivi",
      items: [
        { label: "Journal", icon: ClipboardList, path: "/journal" },
        { label: "Statistiques", icon: BarChart3, path: "/stats" },
        { label: "Évaluation", icon: Target, path: "/evaluation" },
        { label: "Problèmes", icon: AlertTriangle, path: "/problems" },
        { label: "Objectifs", icon: Star, path: "/objectives" },
      ],
    },
    {
      title: "Découvrir",
      items: [
        { label: "Exercices", icon: Dumbbell, path: "/exercises" },
        { label: "Cours IRL", icon: GraduationCap, path: "/courses" },
        { label: "Sécurité", icon: Shield, path: "/safety" },
      ],
    },
    {
      title: "Communication",
      items: [
        { label: "Messages", icon: MessageSquare, path: "/messages", badge: unreadCount },
      ],
    },
    {
      title: "Compte",
      items: [
        { label: "Profil", icon: User, path: "/profile" },
        { label: "Abonnement", icon: CreditCard, path: "/subscription" },
        { label: "Aide", icon: HelpCircle, path: "/help" },
      ],
    },
  ];

  const coachSections: MenuSection[] = [
    {
      title: "Espace Éducateur",
      items: [
        { label: "Dashboard Coach", icon: LayoutDashboard, path: "/coach" },
        { label: "Mes clients", icon: Users, path: "/coach/clients" },
        { label: "Chiens suivis", icon: Dog, path: "/coach/dogs" },
        { label: "Mes cours", icon: GraduationCap, path: "/coach/courses" },
        { label: "Calendrier", icon: CalendarDays, path: "/coach/calendar" },
        { label: "Notes", icon: FileText, path: "/coach/notes" },
        { label: "Statistiques", icon: BarChart3, path: "/coach/stats" },
      ],
    },
  ];

  const adminSections: MenuSection[] = [
    {
      title: "Administration",
      items: [
        { label: "Admin Dashboard", icon: Shield, path: "/admin" },
      ],
    },
  ];

  const allSections = [
    ...userSections,
    ...(isEducator ? coachSections : []),
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
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0 bg-card border-r border-border/40">
        {/* Header */}
        <div className="p-5 pb-3 border-b border-border/30">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground tracking-tight">DogWork</h2>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
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
                {isEducator && <Badge className="text-[9px] px-1.5 py-0 bg-emerald-600 text-white border-0">Éducateur</Badge>}
                {!isAdmin && !isEducator && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Utilisateur</Badge>}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 h-[calc(100vh-180px)]">
          <div className="py-2">
            {allSections.map((section) => {
              const isCoachSection = section.title === "Espace Éducateur";
              const isAdminSection = section.title === "Administration";
              const sectionColor = isCoachSection
                ? "text-emerald-400"
                : isAdminSection
                  ? "text-amber-400"
                  : "text-muted-foreground";
              const accentHsl = isCoachSection
                ? "hsl(160 65% 45%)"
                : isAdminSection
                  ? "hsl(25 95% 55%)"
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
            <span>Se déconnecter</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
