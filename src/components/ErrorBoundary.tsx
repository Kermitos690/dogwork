import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Unhandled UI error:", error, errorInfo);
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
