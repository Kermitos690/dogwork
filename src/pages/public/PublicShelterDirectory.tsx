import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, MapPin, Search } from "lucide-react";

export default function PublicShelterDirectory() {
  const [q, setQ] = useState("");

  useEffect(() => {
    document.title = "Annuaire des refuges — DogWork";
  }, []);

  const { data: shelters = [], isLoading } = useQuery({
    queryKey: ["directory_shelters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shelter_profiles_public_v2" as any)
        .select("slug,name,mission,logo_url,city,country,is_featured,has_badge_video,since_year")
        .order("is_featured", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });

  const filtered = shelters.filter((s: any) => {
    if (!q) return true;
    const k = q.toLowerCase();
    return (
      s.name?.toLowerCase().includes(k) ||
      s.city?.toLowerCase().includes(k) ||
      s.mission?.toLowerCase().includes(k)
    );
  });

  return (
    <div className="container max-w-5xl py-8 px-4 space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">Refuges & associations</h1>
        <p className="text-muted-foreground">Découvrez les refuges actifs sur DogWork et soutenez l'adoption responsable.</p>
      </header>

      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom ou ville…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Aucun refuge ne correspond à votre recherche.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s: any) => (
            <Link key={s.slug} to={`/r/${s.slug}`}>
              <Card className={`h-full hover:border-purple-500/50 transition-colors ${s.is_featured ? "border-purple-500/40 ring-1 ring-purple-500/20" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center font-bold">
                        {s.name?.[0] ?? "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold truncate">{s.name}</h2>
                      {s.since_year && <p className="text-xs text-muted-foreground">Depuis {s.since_year}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.is_featured && <Badge className="text-xs gap-1"><Sparkles className="w-3 h-3" />En avant</Badge>}
                    {s.has_badge_video && <Badge variant="secondary" className="text-xs">Profil enrichi</Badge>}
                    {s.city && <Badge variant="outline" className="text-xs gap-1"><MapPin className="w-3 h-3" />{s.city}</Badge>}
                  </div>
                  {s.mission && <p className="text-xs text-muted-foreground line-clamp-2">{s.mission}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
