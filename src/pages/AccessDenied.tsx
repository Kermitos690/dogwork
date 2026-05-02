import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, LifeBuoy, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AccessDeniedProps {
  title?: string;
  description?: string;
  /** Path to go back to (default: dashboard "/"). */
  backTo?: string;
  backLabel?: string;
}

/**
 * Page friendly utilisée par les guards (CoachGuard, ShelterGuard, AdminGuard, EmployeeGuard)
 * lorsqu'un utilisateur tente d'accéder à un espace qui ne lui appartient pas.
 */
export default function AccessDenied({
  title = "Cette section n'est pas disponible avec votre rôle actuel.",
  description = "Vous pouvez retourner à votre espace DogWork ou contacter le support si vous pensez qu'il s'agit d'une erreur.",
  backTo = "/",
  backLabel = "Retourner à mon espace DogWork",
}: AccessDeniedProps) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-amber-500" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => navigate(backTo)} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Accueil DogWork
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/help")}
              className="w-full text-muted-foreground"
            >
              <LifeBuoy className="mr-2 h-4 w-4" />
              Contacter le support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
