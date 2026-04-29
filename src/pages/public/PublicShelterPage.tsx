import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Globe, MapPin, Award, Sparkles, ArrowLeft, Clock, Calendar } from "lucide-react";

export default function PublicShelterPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public_shelter", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shelter_profiles_public_v2" as any)
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (data?.name) {
      document.title = `${data.name} — Refuge · DogWork`;
      const meta = document.querySelector('meta[name="description"]');
      const desc = (data.mission || data.description || "Refuge canin sur DogWork").slice(0, 155);
      if (meta) meta.setAttribute("content", desc);
    }
  }, [data]);

  if (isLoading) return <div className="container py-16 text-center text-muted-foreground">Chargement…</div>;
  if (error || !data) return (
    <div className="container py-16 text-center space-y-4">
      <h1 className="text-2xl font-bold">Refuge introuvable</h1>
      <p className="text-muted-foreground">Ce refuge n'a pas (ou plus) de page publique.</p>
      <Link to="/annuaire/refuges"><Button variant="outline">Voir l'annuaire</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-purple-500/20 to-purple-500/5 overflow-hidden">
        {data.banner_url && <img src={data.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <Link to="/annuaire/refuges" className="absolute top-4 left-4">
          <Button size="sm" variant="secondary" className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Annuaire
          </Button>
        </Link>
      </div>

      <div className="container max-w-4xl px-4 -mt-16 relative z-10">
        <Card>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-start gap-4">
              {data.logo_url ? (
                <img src={data.logo_url} alt={data.name}
                     className="w-24 h-24 rounded-2xl border-4 border-background object-cover -mt-12" />
              ) : (
                <div className="w-24 h-24 rounded-2xl border-4 border-background bg-muted -mt-12 flex items-center justify-center text-3xl font-bold">
                  {data.name?.[0] ?? "?"}
                </div>
              )}
              <div className="flex-1 pt-2">
                <h1 className="text-2xl md:text-3xl font-bold">{data.name}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.is_featured && <Badge className="gap-1"><Sparkles className="w-3 h-3" /> Mis en avant</Badge>}
                  {data.has_badge_video && <Badge variant="secondary" className="gap-1"><Award className="w-3 h-3" /> Profil enrichi</Badge>}
                  {data.city && <Badge variant="outline" className="gap-1"><MapPin className="w-3 h-3" /> {data.city}{data.country ? `, ${data.country}` : ""}</Badge>}
                  {data.since_year && <Badge variant="outline" className="gap-1"><Calendar className="w-3 h-3" /> Depuis {data.since_year}</Badge>}
                </div>
              </div>
            </div>

            {data.mission && (
              <div className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-4">
                <h2 className="font-semibold mb-1 text-sm uppercase tracking-wide text-purple-600 dark:text-purple-400">Notre mission</h2>
                <p className="text-sm whitespace-pre-line">{data.mission}</p>
              </div>
            )}

            {data.description && (
              <div>
                <h2 className="font-semibold mb-2">À propos</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{data.description}</p>
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
                <h2 className="font-semibold mb-2">Notre refuge en images</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {data.gallery_urls.map((url: string, i: number) => (
                    <img key={i} src={url} alt="" className="rounded-lg aspect-square object-cover" />
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4 grid sm:grid-cols-2 gap-3 text-sm">
              {data.email_public && (
                <a href={`mailto:${data.email_public}`} className="flex items-center gap-2 hover:text-primary">
                  <Mail className="w-4 h-4" /> {data.email_public}
                </a>
              )}
              {data.website && (
                <a href={data.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary">
                  <Globe className="w-4 h-4" /> Site web
                </a>
              )}
              {data.opening_hours && (
                <div className="flex items-start gap-2 sm:col-span-2">
                  <Clock className="w-4 h-4 mt-0.5" />
                  <span className="whitespace-pre-line">{data.opening_hours}</span>
                </div>
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
