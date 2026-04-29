import { useEffect, useState } from "react";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LogoUploader } from "@/components/LogoUploader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Save, ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function CoachProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("coach_profiles")
        .select("display_name, specialty, bio, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name || "");
        setSpecialty(data.specialty || "");
        setBio(data.bio || "");
        setAvatarUrl((data as any).avatar_url || null);
      }
      setLoading(false);
    })();
  }, [user]);

  const persistAvatar = async (url: string | null) => {
    if (!user) return;
    setAvatarUrl(url);
    await supabase.from("coach_profiles").upsert(
      { user_id: user.id, avatar_url: url, display_name: displayName || null },
      { onConflict: "user_id" }
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("coach_profiles").upsert(
      {
        user_id: user.id,
        display_name: displayName || null,
        specialty: specialty || null,
        bio: bio || null,
        avatar_url: avatarUrl,
      },
      { onConflict: "user_id" }
    );
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profil mis à jour ✅" });
    }
  };

  return (
    <CoachLayout>
      <div className="space-y-5 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-primary/15 via-card to-accent/10 border border-primary/20 p-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">
              Identité professionnelle
            </span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Mon cabinet & ma marque</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personnalisez la perception de votre activité — affiché sur vos cours, plans et messages.
          </p>
        </motion.div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> Photo & logo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-xs text-muted-foreground">Chargement…</p>
            ) : (
              <LogoUploader
                value={avatarUrl}
                onChange={persistAvatar}
                shape="circle"
                folder="coach-avatar"
                label="Photo professionnelle / logo cabinet"
                helper="Visible par vos clients dans la liste des coachs, vos cours et vos PDF. PNG / JPG / WebP, 4 Mo max."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informations publiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Nom affiché</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Marie Dubois — Éducation positive"
              />
            </div>
            <div className="space-y-1">
              <Label>Spécialité</Label>
              <Input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Réactivité, chiens sensibles, jeunes chiots…"
              />
            </div>
            <div className="space-y-1">
              <Label>Présentation</Label>
              <Textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Parcours, méthode, certifications, zone d'intervention…"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </CoachLayout>
  );
}
