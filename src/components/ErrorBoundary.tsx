import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Unhandled UI error:", error, errorInfo);

    // Auto-recover from stale chunk references after a new deploy.
    // Typical messages: "Loading chunk X failed", "Importing a module script failed",
    // "Failed to fetch dynamically imported module".
    const msg = `${error?.name || ""} ${error?.message || ""}`.toLowerCase();
    const isChunkError =
      msg.includes("chunkloaderror") ||
      msg.includes("loading chunk") ||
      msg.includes("dynamically imported module") ||
      msg.includes("importing a module script");

    if (isChunkError && typeof window !== "undefined") {
      const w: any = window;
      const KEY = "dogwork:chunk-reload-at";
      const last = Number(w.sessionStorage.getItem(KEY) || "0");
      if (Date.now() - last > 30_000) {
        w.sessionStorage.setItem(KEY, String(Date.now()));
        if ("caches" in w) {
          w.caches.keys()
            .then((keys: string[]) => Promise.all(keys.map((k) => w.caches.delete(k))))
            .finally(() => w.location.reload());
        } else {
          w.location.reload();
        }
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">
              Une erreur est survenue
            </h1>
            <p className="text-muted-foreground">
              Recharge la page ou réessaie dans quelques instants.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40 text-destructive">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={() => window.location.reload()} variant="default">
              Recharger la page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
