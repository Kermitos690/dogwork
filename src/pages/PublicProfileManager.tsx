import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsCoach, useIsShelter } from "@/hooks/useCoach";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Image as ImageIcon, Award, ExternalLink, Coins, Check, Lock } from "lucide-react";

type Kind = "coach" | "shelter";

const BOOSTS = [
  {
    type: "directory_featured" as const,
    feature_key: "boost_directory_featured",
    title: "Mise en avant — annuaire",
    description: "Apparaissez en haut des résultats de l'annuaire pendant 30 jours.",
    icon: Sparkles,
  },
  {
    type: "banner_gallery" as const,
    feature_key: "boost_banner_gallery",
    title: "Bannière + galerie photos",
    description: "Débloquez l'upload d'une bannière et d'une galerie de photos pendant 30 jours.",
    icon: ImageIcon,
  },
  {
    type: "badge_video" as const,
    feature_key: "boost_badge_video",
    title: "Badge enrichi + vidéo de présentation",
    description: "Affichez un badge premium et publiez une vidéo de présentation pendant 30 jours.",
    icon: Award,
  },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function PublicProfileManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: isCoach } = useIsCoach();
  const { data: isShelter } = useIsShelter();
  const kind: Kind | null = isShelter ? "shelter" : isCoach ? "coach" : null;

  useEffect(() => {
    if (kind === null && user) {
      // Redirige owner standard
      navigate("/");
    }
  }, [kind, user, navigate]);

  const tableName = kind === "coach" ? "coach_profiles" : "shelter_profiles";

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public_profile_manager", kind, user?.id],
    enabled: !!user && !!kind,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: boosts = [] } = useQuery({
    queryKey: ["my_boosts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_profile_boosts" as any)
        .select("*")
        .eq("user_id", user!.id)
        .gt("expires_at", new Date().toISOString());
      if (error) return [];
      return (data as any[]) ?? [];
    },
  });

  const { data: balance = 0 } = useQuery({
    queryKey: ["my_credit_balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_credit_balance" as any);
      return (data as any)?.balance ?? 0;
    },
  });

  const { data: boostCosts = {} } = useQuery({
    queryKey: ["boost_costs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("feature_credit_costs" as any)
        .select("feature_key,credit_cost")
        .in("feature_key", BOOSTS.map((b) => b.feature_key));
      const m: Record<string, number> = {};
      ((data as any[]) ?? []).forEach((r) => { m[r.feature_key] = r.credit_cost; });
      return m;
    },
  });

  const activeBoostTypes = useMemo(
    () => new Set((boosts as any[]).map((b) => b.boost_type)),
    [boosts]
  );
  const canUseBannerGallery = activeBoostTypes.has("banner_gallery");
  const canUseBadgeVideo = activeBoostTypes.has("badge_video");

  // Form state
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const update = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from(tableName as any).update(patch).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Page publique mise à jour" });
      qc.invalidateQueries({ queryKey: ["public_profile_manager"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const buyBoost = useMutation({
    mutationFn: async (boostType: string) => {
      const { data, error } = await supabase.rpc("purchase_public_boost" as any, {
        _profile_kind: kind,
        _boost_type: boostType,
      });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error ?? "purchase_failed");
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Boost activé",
        description: `Coût : ${data.cost} crédits · Solde : ${data.balance}`,
      });
      qc.invalidateQueries({ queryKey: ["my_boosts"] });
      qc.invalidateQueries({ queryKey: ["my_credit_balance"] });
    },
    onError: (e: any) => {
      const msg = e.message === "insufficient_credits"
        ? "Crédits insuffisants. Rechargez depuis la boutique."
        : e.message;
      toast({ title: "Achat impossible", description: msg, variant: "destructive" });
    },
  });

  // Slug auto-generation suggestion
  const suggestedSlug = useMemo(() => {
    if (!form) return "";
    const src = kind === "coach" ? form.display_name : form.name;
    return src ? slugify(src) : "";
  }, [form, kind]);

  if (!kind || isLoading) return <div className="container py-8 text-muted-foreground">Chargement…</div>;
  if (!profile) return (
    <div className="container py-8 space-y-3">
      <h1 className="text-2xl font-bold">Ma page publique</h1>
      <p className="text-muted-foreground">Complétez d'abord votre profil pour activer votre page publique.</p>
    </div>
  );

  const slug = form.slug || profile.slug;
  const previewPath = kind === "coach" ? `/c/${slug}` : `/r/${slug}`;

  return (
    <div className="container max-w-3xl py-6 px-4 pb-24 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold">Ma page publique</h1>
        <p className="text-sm text-muted-foreground">
          Vitrine accessible à toute personne ayant le lien · indexable par les moteurs de recherche.
        </p>
      </header>

      {/* Crédits + état */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Coins className="w-4 h-4 text-primary" />
            <span>Solde : <strong>{balance}</strong> crédits</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/shop")}>
            Acheter des crédits
          </Button>
        </CardContent>
      </Card>

      {/* Publication & slug */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Page publiée</Label>
              <p className="text-xs text-muted-foreground">
                Si désactivé, la page renvoie une 404 publique.
              </p>
            </div>
            <Switch
              checked={!!form.is_published}
              onCheckedChange={(v) => setForm({ ...form, is_published: v })}
            />
          </div>

          <div>
            <Label htmlFor="slug">Identifiant URL (slug)</Label>
            <Input
              id="slug"
              value={form.slug ?? ""}
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              placeholder={suggestedSlug || "votre-nom"}
            />
            {form.slug && (
              <p className="text-xs text-muted-foreground mt-1 break-all">
                URL : <code>{window.location.origin}{kind === "coach" ? "/c/" : "/r/"}{form.slug}</code>
              </p>
            )}
            {!form.slug && suggestedSlug && (
              <Button variant="link" size="sm" className="h-auto p-0 mt-1"
                onClick={() => setForm({ ...form, slug: suggestedSlug })}>
                Utiliser <code>{suggestedSlug}</code>
              </Button>
            )}
          </div>

          {profile.is_published && profile.slug && (
            <Button variant="outline" size="sm" asChild>
              <a href={previewPath} target="_blank" rel="noreferrer">
                Voir ma page <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Contenu de base */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contenu de la page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {kind === "coach" ? (
            <>
              <div>
                <Label>Nom affiché</Label>
                <Input value={form.display_name ?? ""} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
              </div>
              <div>
                <Label>Spécialité</Label>
                <Input value={form.specialty ?? ""} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea rows={4} value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Email public</Label>
                  <Input value={form.public_email ?? ""} onChange={(e) => setForm({ ...form, public_email: e.target.value })} />
                </div>
                <div>
                  <Label>Téléphone public</Label>
                  <Input value={form.public_phone ?? ""} onChange={(e) => setForm({ ...form, public_phone: e.target.value })} />
                </div>
                <div>
                  <Label>Site web</Label>
                  <Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Nom du refuge</Label>
                <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Mission</Label>
                <Textarea rows={3} value={form.mission ?? ""} onChange={(e) => setForm({ ...form, mission: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={4} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Email public</Label>
                  <Input value={form.email_public ?? ""} onChange={(e) => setForm({ ...form, email_public: e.target.value })} />
                </div>
                <div>
                  <Label>Site web</Label>
                  <Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label>Année de création</Label>
                  <Input type="number" value={form.since_year ?? ""} onChange={(e) => setForm({ ...form, since_year: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div>
                <Label>Horaires d'ouverture</Label>
                <Textarea rows={2} value={form.opening_hours ?? ""} onChange={(e) => setForm({ ...form, opening_hours: e.target.value })} />
              </div>
            </>
          )}

          <Button onClick={() => update.mutate(form)} disabled={update.isPending}>
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>

      {/* Médias enrichis (gated) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Bannière, galerie & vidéo
            {!canUseBannerGallery && !canUseBadgeVideo && (
              <Badge variant="outline" className="gap-1 text-xs"><Lock className="w-3 h-3" /> Boost requis</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>URL de la bannière</Label>
            <Input
              value={form.banner_url ?? ""}
              onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
              placeholder="https://…"
              disabled={!canUseBannerGallery}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {canUseBannerGallery ? "Image large (1600×400 recommandé)." : "Activez le boost « Bannière + galerie » pour utiliser ce champ."}
            </p>
          </div>
          <div>
            <Label>URLs de la galerie (une par ligne)</Label>
            <Textarea
              rows={3}
              value={(form.gallery_urls ?? []).join("\n")}
              onChange={(e) => setForm({ ...form, gallery_urls: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
              disabled={!canUseBannerGallery}
            />
          </div>
          <div>
            <Label>URL vidéo de présentation</Label>
            <Input
              value={form.video_url ?? ""}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              placeholder="https://…"
              disabled={!canUseBadgeVideo}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {canUseBadgeVideo ? "MP4 hébergé publiquement." : "Activez le boost « Badge enrichi + vidéo » pour utiliser ce champ."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* BOOSTS */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Enrichissements payants</h2>
          <Badge variant="secondary" className="gap-1">
            <Coins className="w-3 h-3" /> {balance} crédits
          </Badge>
        </div>
        <div className="grid gap-3">
          {BOOSTS.map((b) => {
            const cost = boostCosts[b.feature_key] ?? null;
            const active = activeBoostTypes.has(b.type);
            const activeBoost = (boosts as any[]).find((x) => x.boost_type === b.type);
            const Icon = b.icon;
            return (
              <Card key={b.type} className={active ? "border-primary/40" : ""}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{b.title}</h3>
                      {active && <Badge className="gap-1 text-xs"><Check className="w-3 h-3" /> Actif</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{b.description}</p>
                    {active && activeBoost && (
                      <p className="text-xs text-muted-foreground">
                        Expire le {new Date(activeBoost.expires_at).toLocaleDateString("fr-CH")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{cost ?? "?"} cr.</div>
                    <Button
                      size="sm"
                      className="mt-2"
                      disabled={cost === null || buyBoost.isPending || balance < (cost ?? Infinity)}
                      onClick={() => buyBoost.mutate(b.type)}
                    >
                      {active ? "Renouveler" : "Activer"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Tous les boosts durent 30 jours. Les crédits sont débités immédiatement à l'activation. Aucun renouvellement automatique.
        </p>
      </section>
    </div>
  );
}
