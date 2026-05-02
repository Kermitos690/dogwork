import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Compass, Home, ArrowLeft, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.warn("[404] Route inexistante:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Compass className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-foreground">
              Cette page n'existe pas ou n'est plus disponible.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vérifiez l'adresse, ou retournez à votre espace DogWork pour reprendre là où vous étiez.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => navigate(-1)} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Revenir en arrière
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Retourner à mon espace DogWork
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
};

export default NotFound;
