import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Globe, MapPin, Award, Sparkles, ArrowLeft } from "lucide-react";

export default function PublicCoachPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public_coach", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_profiles_public" as any)
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (data?.display_name) {
      document.title = `${data.display_name} — Éducateur canin · DogWork`;
      const meta = document.querySelector('meta[name="description"]');
      const desc = (data.bio || data.specialty || "Profil éducateur canin sur DogWork").slice(0, 155);
      if (meta) meta.setAttribute("content", desc);
    }
  }, [data]);

  if (isLoading) return <div className="container py-16 text-center text-muted-foreground">Chargement…</div>;
  if (error || !data) return (
    <div className="container py-16 text-center space-y-4">
      <h1 className="text-2xl font-bold">Profil introuvable</h1>
      <p className="text-muted-foreground">Cet éducateur n'a pas (ou plus) de page publique.</p>
      <Link to="/annuaire/coachs"><Button variant="outline">Voir l'annuaire</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {data.banner_url && (
          <img src={data.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <Link to="/annuaire/coachs" className="absolute top-4 left-4">
          <Button size="sm" variant="secondary" className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Annuaire
          </Button>
        </Link>
      </div>

      <div className="container max-w-4xl px-4 -mt-16 relative z-10">
        <Card>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-start gap-4">
              {data.avatar_url ? (
                <img src={data.avatar_url} alt={data.display_name}
                     className="w-24 h-24 rounded-full border-4 border-background object-cover -mt-12" />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-background bg-muted -mt-12 flex items-center justify-center text-3xl font-bold">
                  {data.display_name?.[0] ?? "?"}
                </div>
              )}
              <div className="flex-1 pt-2">
                <h1 className="text-2xl md:text-3xl font-bold">{data.display_name}</h1>
                {data.specialty && <p className="text-muted-foreground">{data.specialty}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.is_featured && <Badge className="gap-1"><Sparkles className="w-3 h-3" /> Mis en avant</Badge>}
                  {data.has_badge_video && <Badge variant="secondary" className="gap-1"><Award className="w-3 h-3" /> Profil enrichi</Badge>}
                  {data.city && <Badge variant="outline" className="gap-1"><MapPin className="w-3 h-3" /> {data.city}</Badge>}
                </div>
              </div>
            </div>

            {data.bio && (
              <div>
                <h2 className="font-semibold mb-2">À propos</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{data.bio}</p>
              </div>
            )}

            {data.video_url && data.has_badge_video && (
              <div>
                <h2 className="font-semibold mb-2">Présentation vidéo</h2>
                <video src={data.video_url} controls className="w-full rounded-lg" />
              </div>
            )}

            {Array.isArray(data.gallery_urls) && data.gallery_urls.length > 0 && (
              <div>
                <h2 className="font-semibold mb-2">Galerie</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {data.gallery_urls.map((url: string, i: number) => (
                    <img key={i} src={url} alt="" className="rounded-lg aspect-square object-cover" />
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4 grid sm:grid-cols-2 gap-3 text-sm">
              {data.public_email && (
                <a href={`mailto:${data.public_email}`} className="flex items-center gap-2 hover:text-primary">
                  <Mail className="w-4 h-4" /> {data.public_email}
                </a>
              )}
              {data.public_phone && (
                <a href={`tel:${data.public_phone}`} className="flex items-center gap-2 hover:text-primary">
                  <Phone className="w-4 h-4" /> {data.public_phone}
                </a>
              )}
              {data.website && (
                <a href={data.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary">
                  <Globe className="w-4 h-4" /> Site web
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6 pb-8">
          Page publique propulsée par <Link to="/landing" className="underline">DogWork</Link>
        </p>
      </div>
    </div>
  );
}
