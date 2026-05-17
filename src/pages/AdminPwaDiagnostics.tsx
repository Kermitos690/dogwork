import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import {
  detectPlatform,
  detectIosBrowser,
  isStandalone,
  isInAppBrowser,
  hasServiceWorker,
  hasManifest,
  getUserAgent,
  useBeforeInstallPrompt,
} from "@/lib/pwa";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function YesNo({ v }: { v: boolean | null }) {
  if (v === null) return <Badge variant="outline">…</Badge>;
  return v
    ? <Badge className="bg-emerald-600 hover:bg-emerald-600/90">Oui</Badge>
    : <Badge variant="secondary">Non</Badge>;
}

export default function AdminPwaDiagnostics() {
  const platform = detectPlatform();
  const iosBrowser = detectIosBrowser();
  const { available } = useBeforeInstallPrompt();
  const [sw, setSw] = useState<boolean | null>(null);
  const [manifest, setManifest] = useState<boolean | null>(null);

  useEffect(() => {
    hasServiceWorker().then(setSw);
    hasManifest().then(setManifest);
  }, []);

  const ua = getUserAgent();
  const standalone = isStandalone();
  const inApp = isInAppBrowser();

  return (
    <div className="min-h-screen bg-background pt-16">
      <SEO title="Diagnostic PWA — Admin" description="État d'installation PWA détecté côté client." path="/admin/pwa-diagnostics" />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Diagnostic PWA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lecture client (cet appareil, ce navigateur). Pour tester un autre device, ouvre cette page dessus.
          </p>
        </header>

        <Card>
          <CardHeader><CardTitle className="text-base">Détection navigateur</CardTitle></CardHeader>
          <CardContent>
            <Row label="Plateforme" value={<Badge variant="outline">{platform}</Badge>} />
            <Row label="iOS" value={<YesNo v={platform === "ios"} />} />
            <Row label="Safari iOS" value={<YesNo v={platform === "ios" && iosBrowser === "safari"} />} />
            <Row label="Chrome iOS (CriOS)" value={<YesNo v={iosBrowser === "chrome"} />} />
            <Row label="Firefox iOS (FxiOS)" value={<YesNo v={iosBrowser === "firefox"} />} />
            <Row label="Edge iOS (EdgiOS)" value={<YesNo v={iosBrowser === "edge"} />} />
            <Row label="Navigateur in-app" value={<YesNo v={inApp} />} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">État d'installation</CardTitle></CardHeader>
          <CardContent>
            <Row label="Mode standalone" value={<YesNo v={standalone} />} />
            <Row label="beforeinstallprompt disponible" value={<YesNo v={available} />} />
            <Row label="Service worker enregistré" value={<YesNo v={sw} />} />
            <Row label="Manifest accessible" value={<YesNo v={manifest} />} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">User Agent</CardTitle></CardHeader>
          <CardContent>
            <code className="text-xs break-all block bg-muted/40 p-3 rounded-md">{ua}</code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Comportement attendu</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong className="text-foreground">Android Chrome / Edge :</strong> bouton « Installer » natif via beforeinstallprompt.</p>
            <p><strong className="text-foreground">iPhone Safari :</strong> bottom sheet avec étapes Partager → Sur l'écran d'accueil → Ajouter.</p>
            <p><strong className="text-foreground">Chrome iOS / Firefox iOS / Edge iOS / in-app :</strong> message « Ouvre dans Safari » + bouton Copier le lien (limite Apple, non contournable).</p>
            <p><strong className="text-foreground">Déjà installée :</strong> bannière masquée, page /install affiche un état emerald.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
