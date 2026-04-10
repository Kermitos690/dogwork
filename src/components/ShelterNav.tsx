import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, PawPrint, MessageSquare, BarChart3, Settings, HelpCircle } from "lucide-react";

const tabs = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/shelter" },
  { label: "Animaux", icon: PawPrint, path: "/shelter/animals" },
  { label: "Messages", icon: MessageSquare, path: "/shelter/messages", hasBadge: true },
  { label: "Stats", icon: BarChart3, path: "/shelter/stats" },
  { label: "Support", icon: HelpCircle, path: "/shelter/support" },
];

export function ShelterNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["shelter-unread-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user!.id)
        .eq("read", false);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const isActive = (path: string) => {
    if (path === "/shelter") return location.pathname === "/shelter";
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
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] transition-colors ${
                active ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              <tab.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
              <span>{tab.label}</span>
              {tab.hasBadge && unreadCount > 0 && (
                <span className="absolute -top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
