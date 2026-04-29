import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function PublicCoachDirectory() {
  const [q, setQ] = useState("");

  useEffect(() => {
    document.title = "Annuaire des éducateurs canins — DogWork";
  }, []);

  const { data: coaches = [], isLoading } = useQuery({
    queryKey: ["directory_coaches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_profiles_public" as any)
        .select("slug,display_name,specialty,bio,avatar_url,city,is_featured,has_badge_video")
        .order("is_featured", { ascending: false })
        .order("display_name");
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 60_000,
  });

  const filtered = coaches.filter((c: any) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      c.display_name?.toLowerCase().includes(s) ||
      c.specialty?.toLowerCase().includes(s) ||
      c.city?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="container max-w-5xl py-8 px-4 space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">Éducateurs canins</h1>
        <p className="text-muted-foreground">Trouvez un professionnel près de chez vous, vérifié sur DogWork.</p>
      </header>

      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, spécialité, ville…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Aucun éducateur ne correspond à votre recherche.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c: any) => (
            <Link key={c.slug} to={`/c/${c.slug}`}>
              <Card className={`h-full hover:border-primary/50 transition-colors ${c.is_featured ? "border-primary/40 ring-1 ring-primary/20" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold">
                        {c.display_name?.[0] ?? "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold truncate">{c.display_name}</h2>
                      {c.specialty && <p className="text-xs text-muted-foreground truncate">{c.specialty}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.is_featured && <Badge className="text-xs gap-1"><Sparkles className="w-3 h-3" />En avant</Badge>}
                    {c.has_badge_video && <Badge variant="secondary" className="text-xs">Profil enrichi</Badge>}
                    {c.city && <Badge variant="outline" className="text-xs gap-1"><MapPin className="w-3 h-3" />{c.city}</Badge>}
                  </div>
                  {c.bio && <p className="text-xs text-muted-foreground line-clamp-2">{c.bio}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
