import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Mail, Send } from "lucide-react";
import SEO from "@/components/SEO";

const INTEREST_LABELS: Record<string, string> = {
  shelter: "Refuge & Chenil",
  coach: "Éducateur / Coach",
  owner: "Propriétaire",
  partnership: "Partenariat",
  other: "Autre",
};

const STRUCTURE_TYPES = [
  { value: "refuge", label: "Refuge / Association" },
  { value: "chenil", label: "Chenil / Pension" },
  { value: "coach", label: "Éducateur indépendant" },
  { value: "particulier", label: "Particulier" },
  { value: "autre", label: "Autre" },
];

export default function Contact() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialInterest = searchParams.get("interest") || "other";

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    structure_type: initialInterest === "shelter" ? "refuge" : "",
    structure_name: "",
    dog_count: "",
    interest: initialInterest,
    message: "",
  });

  useEffect(() => {
    // Pré-remplir email si user connecté
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email && !form.email) {
        setForm((f) => ({ ...f, email: data.user!.email! }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({
        title: "Champs requis",
        description: "Merci de renseigner votre nom, email et message.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const id = crypto.randomUUID();

      const { error } = await supabase.from("contact_requests").insert({
        id,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        structure_type: form.structure_type || null,
        structure_name: form.structure_name.trim() || null,
        dog_count: form.dog_count ? parseInt(form.dog_count, 10) : null,
        interest: form.interest,
        message: form.message.trim(),
        source: "landing_pricing",
        user_id: userData.user?.id || null,
        user_agent: navigator.userAgent.slice(0, 500),
      });

      if (error) throw error;

      // Tentative d'envoi email de confirmation (best-effort, ne bloque pas)
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-confirmation",
          recipientEmail: form.email.trim().toLowerCase(),
          idempotencyKey: `contact-confirm-${id}`,
          templateData: { name: form.name.trim() },
        },
      }).catch((err) => {
        console.warn("[Contact] Email confirmation failed (non-bloquant):", err);
      });

      setSubmitted(true);
      toast({
        title: "Demande enregistrée",
        description: "Nous revenons vers vous très rapidement.",
      });
    } catch (err: any) {
      console.error("[Contact] Erreur enregistrement:", err);
      toast({
        title: "Erreur",
        description:
          err?.message ||
          "Impossible d'enregistrer votre demande. Réessayez ou écrivez-nous à contact@dogwork-at-home.com.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <SEO title="Demande envoyée — DogWork" description="Votre demande a bien été reçue." />
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto rounded-full bg-emerald-500/10 p-4 w-fit mb-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl">Merci {form.name.split(" ")[0]} !</CardTitle>
            <CardDescription>
              Votre demande a bien été enregistrée. Notre équipe vous recontacte
              sous 24 à 48&nbsp;h ouvrées.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Un email de confirmation est en cours d'envoi à <strong>{form.email}</strong>.
              S'il n'arrive pas, écrivez-nous directement à{" "}
              <a href="mailto:contact@dogwork-at-home.com" className="text-primary underline">
                contact@dogwork-at-home.com
              </a>.
            </p>
            <Button onClick={() => navigate("/")} className="w-full mt-4" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const interestLabel = INTEREST_LABELS[form.interest] || "Contact";

  return (
    <div className="min-h-screen bg-background pt-16 pb-16 px-4">
      <SEO
        title={`Contact ${interestLabel} — DogWork`}
        description="Contactez l'équipe DogWork pour discuter de vos besoins en refuge, chenil, éducation canine ou partenariat."
      />
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg p-2 bg-primary/10 text-primary">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {interestLabel}
              </span>
            </div>
            <CardTitle className="text-3xl">Parlons de votre structure</CardTitle>
            <CardDescription>
              {form.interest === "shelter"
                ? "Refuges, associations et chenils : nous adaptons l'offre à votre réalité. Décrivez-nous votre besoin, nous vous proposerons un accompagnement sur mesure."
                : "Une question, un projet, une demande de partenariat ? Nous vous répondons sous 24 à 48 h."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Votre nom *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Prénom Nom"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    placeholder="vous@exemple.com"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+41 ..."
                  />
                </div>
                <div>
                  <Label htmlFor="structure_type">Type de structure</Label>
                  <Select
                    value={form.structure_type}
                    onValueChange={(v) => setForm({ ...form, structure_type: v })}
                  >
                    <SelectTrigger id="structure_type">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {STRUCTURE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="structure_name">Nom de la structure</Label>
                  <Input
                    id="structure_name"
                    value={form.structure_name}
                    onChange={(e) => setForm({ ...form, structure_name: e.target.value })}
                    placeholder="Refuge X, Chenil Y..."
                  />
                </div>
                <div>
                  <Label htmlFor="dog_count">Nombre de chiens accueillis</Label>
                  <Input
                    id="dog_count"
                    type="number"
                    min="0"
                    value={form.dog_count}
                    onChange={(e) => setForm({ ...form, dog_count: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="message">Votre message *</Label>
                <Textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                  rows={5}
                  placeholder={
                    form.interest === "shelter"
                      ? "Décrivez votre structure, vos besoins, le nombre d'employés, vos contraintes..."
                      : "Décrivez votre besoin..."
                  }
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full"
                size="lg"
              >
                {submitting ? (
                  "Envoi en cours..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" /> Envoyer ma demande
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center pt-2">
                Vos données restent confidentielles et ne servent qu'à vous recontacter.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
