import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

export interface AdminHubLink {
  title: string;
  desc: string;
  icon: LucideIcon;
  path?: string;
  onClick?: () => void;
  badge?: string;
  disabled?: boolean;
}

interface AdminHubProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  links: AdminHubLink[];
  /** Affiché sous les liens — empty state, info de contexte, etc. */
  footer?: ReactNode;
}

/**
 * Page hub admin générique : titre, sous-titre, liste de raccourcis vers
 * les vrais outils existants, et un emplacement footer pour empty state /
 * indication "fonctionnalité à venir".
 */
export function AdminHub({ title, subtitle, icon: Icon, links, footer }: AdminHubProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau admin
        </button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Icon className="h-5 w-5 text-amber-500" />
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </motion.div>

        <div className="space-y-2">
          {links.map((link) => {
            const handleClick = () => {
              if (link.disabled) return;
              if (link.onClick) link.onClick();
              else if (link.path) navigate(link.path);
            };
            return (
              <Card
                key={link.title}
                className={`transition-all ${
                  link.disabled
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer card-press hover:border-amber-500/40"
                }`}
                onClick={handleClick}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <link.icon className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                      {link.title}
                      {link.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                          {link.badge}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
                  </div>
                  {!link.disabled && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {footer && <div className="pt-2">{footer}</div>}
      </div>
    </div>
  );
}

interface AdminHubEmptyStateProps {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function AdminHubEmptyState({ title, description, action }: AdminHubEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-6 text-center space-y-3">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {action && (
          <Button variant="outline" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
