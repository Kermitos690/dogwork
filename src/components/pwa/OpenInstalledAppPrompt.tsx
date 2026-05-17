import { useState } from "react";
import { Smartphone, Home, ExternalLink, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOpenInstalledPwaPrompt } from "@/hooks/useOpenInstalledPwaPrompt";

/**
 * Pop-up "Ouvrir DogWork comme application" affiché lorsque la PWA
 * est détectée comme installée mais que l'utilisateur navigue dans
 * Safari / Chrome / etc.
 *
 * Limitation technique: aucun navigateur ne fournit d'API permettant
 * d'ouvrir directement une PWA installée. Sur Android on tente une
 * navigation vers "/" (start_url), sur iOS on guide vers l'icône
 * d'écran d'accueil.
 */
export function OpenInstalledAppPrompt() {
  const { open, platform, isInApp, close, later, neverShow } = useOpenInstalledPwaPrompt();
  const [androidFallback, setAndroidFallback] = useState(false);

  const handleOpen = () => {
    if (platform === "android") {
      // Tentative honnête : naviguer vers la start_url. Si le système
      // a enregistré la PWA pour cette origine, certains Chromium
      // proposent de basculer en app. Sinon on affiche l'instruction.
      try {
        window.location.assign("/?source=open-installed");
      } catch {}
      window.setTimeout(() => setAndroidFallback(true), 800);
      return;
    }
    // iOS / inapp / autres : pas de bascule possible.
    close();
  };

  const onOpenChange = (next: boolean) => {
    if (!next) {
      setAndroidFallback(false);
      close();
    }
  };

  const isIOS = platform === "ios";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-lg">
            Ouvrir DogWork comme application&nbsp;?
          </DialogTitle>
          <DialogDescription className="text-center">
            DogWork semble déjà installé sur votre téléphone. Pour une meilleure
            expérience, ouvrez-le depuis l'application installée.
          </DialogDescription>
        </DialogHeader>

        {isIOS && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
            <div className="flex items-start gap-2">
              <Home className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Sur iPhone, Safari ne permet pas d'ouvrir automatiquement une
                application installée. Touchez l'icône <strong>DogWork</strong>{" "}
                sur votre écran d'accueil pour la lancer en mode application.
              </p>
            </div>
          </div>
        )}

        {!isIOS && !androidFallback && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Si la bascule automatique ne fonctionne pas, ouvrez l'icône{" "}
                <strong>DogWork</strong> sur votre écran d'accueil.
              </p>
            </div>
          </div>
        )}

        {androidFallback && (
          <div className="rounded-lg border bg-amber-500/10 p-3 text-sm leading-relaxed text-foreground">
            <div className="flex items-start gap-2">
              <Home className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>
                Si DogWork ne s'est pas ouvert automatiquement, ouvrez l'icône{" "}
                <strong>DogWork</strong> sur votre écran d'accueil.
              </p>
            </div>
          </div>
        )}

        {isInApp && (
          <p className="text-center text-xs text-muted-foreground">
            Vous semblez être dans un navigateur intégré. Ouvrez ce lien dans
            Safari ou Chrome pour de meilleurs résultats.
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {isIOS ? (
            <Button className="w-full" onClick={close}>
              J'ai compris
            </Button>
          ) : (
            <Button className="w-full" onClick={handleOpen}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Ouvrir l'application
            </Button>
          )}
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={later}>
              Plus tard
            </Button>
            <Button variant="ghost" className="flex-1" onClick={neverShow}>
              Ne plus afficher
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
