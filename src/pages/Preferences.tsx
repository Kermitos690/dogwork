import { useNavigate } from "react-router-dom";
import { ArrowLeft, Palette, Eye, Settings2, Check, Sun, Moon, Bell } from "lucide-react";
import { PushNotificationCard } from "@/components/PushNotificationCard";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { usePreferences, AccentColor } from "@/hooks/usePreferences";
import { AppLayout } from "@/components/AppLayout";

const ACCENT_COLORS: { key: AccentColor; label: string; hsl: string }[] = [
  { key: "blue", label: "Bleu", hsl: "210 100% 60%" },
  { key: "purple", label: "Violet", hsl: "270 80% 65%" },
  { key: "cyan", label: "Cyan", hsl: "185 85% 55%" },
  { key: "pink", label: "Rose", hsl: "330 80% 60%" },
  { key: "emerald", label: "Émeraude", hsl: "160 65% 45%" },
  { key: "amber", label: "Ambre", hsl: "38 92% 55%" },
  { key: "red", label: "Rouge", hsl: "0 72% 55%" },
];

const SECTIONS = [
  { key: "journal", label: "Journal" },
  { key: "stats", label: "Statistiques" },
  { key: "exercises", label: "Bibliothèque d'exercices" },
  { key: "courses", label: "Cours IRL" },
  { key: "safety", label: "Sécurité" },
  { key: "messages", label: "Messages" },
];

export default function Preferences() {
  const navigate = useNavigate();
  const { preferences, updatePreference } = usePreferences();

  const toggleSection = (key: string) => {
    const current = preferences.visible_sections;
    const next = current.includes(key)
      ? current.filter((s) => s !== key)
      : [...current, key];
    updatePreference("visible_sections", next);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg px-4 py-6 pb-28 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Préférences</h1>
        </div>

        {/* Accent Color */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Palette className="h-4 w-4 text-primary" />
            Couleur d'accent
          </div>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map((c) => {
              const isSelected = preferences.accent_color === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => updatePreference("accent_color", c.key)}
                  className="flex flex-col items-center gap-1.5"
                  title={c.label}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: `hsl(${c.hsl})`,
                      boxShadow: isSelected ? `0 0 0 3px hsl(${c.hsl} / 0.3), 0 0 12px hsl(${c.hsl} / 0.4)` : "none",
                      border: isSelected ? `2px solid hsl(${c.hsl})` : "2px solid transparent",
                    }}
                  >
                    {isSelected && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{c.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Theme Mode */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="rounded-2xl bg-card border border-border p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sun className="h-4 w-4 text-primary" />
            Thème
          </div>
          <div className="flex gap-3">
            {([
              { key: "dark" as const, label: "Sombre", icon: Moon },
              { key: "light" as const, label: "Clair", icon: Sun },
            ]).map((t) => {
              const isSelected = preferences.theme_mode === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => updatePreference("theme_mode", t.key)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-medium transition-all border ${
                    isSelected
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Visible Sections */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-card border border-border p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Eye className="h-4 w-4 text-primary" />
            Visibilité des modules
          </div>
          <p className="text-xs text-muted-foreground">Masquez les sections que vous n'utilisez pas dans le menu.</p>
          <div className="space-y-3">
            {SECTIONS.map((s) => (
              <div key={s.key} className="flex items-center justify-between">
                <span className="text-sm">{s.label}</span>
                <Switch
                  checked={preferences.visible_sections.includes(s.key)}
                  onCheckedChange={() => toggleSection(s.key)}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Notifications Push */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground px-1">
            <Bell className="h-4 w-4 text-primary" />
            Notifications push
          </div>
          <PushNotificationCard />
        </motion.div>

        {/* Feature Toggles */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Settings2 className="h-4 w-4 text-primary" />
            Fonctionnalités
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm">Chatbot IA</span>
                <p className="text-xs text-muted-foreground">Assistant intelligent</p>
              </div>
              <Switch
                checked={!preferences.hide_chatbot}
                onCheckedChange={(v) => updatePreference("hide_chatbot", !v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm">Lecture à voix haute</span>
                <p className="text-xs text-muted-foreground">Bouton de lecture vocale</p>
              </div>
              <Switch
                checked={!preferences.hide_read_aloud}
                onCheckedChange={(v) => updatePreference("hide_read_aloud", !v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm">Visite guidée</span>
                <p className="text-xs text-muted-foreground">Tour automatique au 1er lancement</p>
              </div>
              <Switch
                checked={!preferences.hide_guided_tour}
                onCheckedChange={(v) => updatePreference("hide_guided_tour", !v)}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
