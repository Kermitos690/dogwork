import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Trash2, RotateCcw, Info, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Layout } from "@/components/Layout";
import { getSettings, saveSettings, resetAll, exportJSON, exportText } from "@/lib/storage";
import {
  getNotificationSettings, saveNotificationSettings,
  requestNotificationPermission, getPermissionStatus,
  sendTestNotification, scheduleDaily, stopSchedule,
} from "@/lib/notifications";

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(getSettings());
  const [showConfirm, setShowConfirm] = useState(false);
  const [notifSettings, setNotifSettings] = useState(getNotificationSettings());
  const [permStatus, setPermStatus] = useState(getPermissionStatus());

  const toggleNotif = async (enabled: boolean) => {
    if (enabled && permStatus !== "granted") {
      const p = await requestNotificationPermission();
      setPermStatus(p);
      if (p !== "granted") return;
    }
    const updated = { ...notifSettings, enabled };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
    if (enabled) scheduleDaily(); else stopSchedule();
  };

  const updateNotifTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const updated = { ...notifSettings, hour: h, minute: m };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
    if (updated.enabled) scheduleDaily();
  };

  const updateDogName = (name: string) => {
    const updated = { ...settings, dogName: name };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleExportJSON = () => {
    const data = exportJSON();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `defi-canin-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportText = () => {
    const data = exportText();
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `defi-canin-resume-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    resetAll();
    setShowConfirm(false);
    window.location.href = "/";
  };

  return (
    <Layout>
      <div className="animate-fade-in space-y-5 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>

        <h1 className="text-2xl font-bold">Paramètres</h1>

        {/* Dog name */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <label className="text-sm font-medium">Nom du chien</label>
          <input
            type="text"
            value={settings.dogName}
            onChange={(e) => updateDogName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Export */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Exporter mes données</h3>
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="w-full justify-start" onClick={handleExportJSON}>
              <Download className="h-4 w-4" /> Exporter
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handleExportText}>
              <Download className="h-4 w-4" /> Exporter un résumé texte
            </Button>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            {notifSettings.enabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            <h3 className="text-sm font-semibold">Rappels quotidiens</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Activer les rappels</span>
            <Switch checked={notifSettings.enabled} onCheckedChange={toggleNotif} />
          </div>
          {notifSettings.enabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Heure du rappel</span>
                <input
                  type="time"
                  value={`${String(notifSettings.hour).padStart(2, "0")}:${String(notifSettings.minute).padStart(2, "0")}`}
                  onChange={(e) => updateNotifTime(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={sendTestNotification}>
                Tester la notification
              </Button>
            </div>
          )}
          {permStatus === "denied" && (
            <p className="text-xs text-destructive">Les notifications sont bloquées par votre navigateur. Modifiez les paramètres du site.</p>
          )}
          {permStatus === "unsupported" && (
            <p className="text-xs text-muted-foreground">Les notifications ne sont pas supportées par ce navigateur.</p>
          )}
        </div>

        {/* Storage info */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Sauvegarde locale</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Toutes vos données sont sauvegardées localement sur cet appareil (localStorage).
            Elles ne sont envoyées nulle part. Si vous effacez les données du navigateur,
            vos progrès seront perdus. Pensez à exporter régulièrement.
          </p>
        </div>

        {/* Reset */}
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-destructive">Réinitialiser</h3>
          {!showConfirm ? (
            <Button variant="destructive" className="w-full" onClick={() => setShowConfirm(true)}>
              <Trash2 className="h-4 w-4" /> Remettre le programme à zéro
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-destructive">Êtes-vous sûr(e) ? Toutes les données seront effacées.</p>
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" /> Confirmer
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Version */}
        <div className="text-center text-xs text-muted-foreground pb-4">
          <p>Défi Canin 28 Jours — v1.0</p>
          <p className="mt-1">Application de suivi d'obéissance canine</p>
        </div>
      </div>
    </Layout>
  );
}
