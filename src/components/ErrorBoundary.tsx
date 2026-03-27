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

    // Global error reporting — send to edge function or external service
    try {
      const payload = {
        message: error.message,
        stack: error.stack?.slice(0, 2000),
        componentStack: errorInfo.componentStack?.slice(0, 2000),
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };
      // Best-effort beacon to avoid blocking
      navigator.sendBeacon?.(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-error`,
        new Blob([JSON.stringify(payload)], { type: "application/json" })
      );
    } catch {
      // Silently fail — error reporting should never break the app
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
