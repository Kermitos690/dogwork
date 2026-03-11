import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dog, Play, BookOpen, BarChart3, ClipboardList, Shield, GraduationCap,
  ShieldCheck, Users, FileText, Plus, Calendar, Sparkles, HelpCircle,
  MessageSquare, Bot, Target, Eye, Zap, PawPrint, Star
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useIsCoach } from "@/hooks/useCoach";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.3 } }),
};

function Section({ icon: Icon, title, children, index = 0 }: { icon: any; title: string; children: React.ReactNode; index?: number }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" custom={index}>
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">{n}</span>
      <span>{text}</span>
    </div>
  );
}

/* ─── ONGLET UTILISATEUR ─── */
function UserGuide() {
  return (
    <div className="space-y-3">
      <Section icon={PawPrint} title="Démarrer avec DogWork" index={0}>
        <Step n={1} text="Créez votre compte avec email + mot de passe, puis confirmez par email." />
        <Step n={2} text="Suivez l'onboarding en 12 étapes : identité du chien, santé, évaluation comportementale, objectifs." />
        <Step n={3} text="Cliquez « Générer mon plan » pour obtenir un programme 100% personnalisé." />
      </Section>

      <Section icon={Calendar} title="Navigation principale" index={1}>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5"><Play className="h-3.5 w-3.5 text-primary" /><span>Accueil — Vue d'ensemble</span></div>
          <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-primary" /><span>Plan — Programme jour/jour</span></div>
          <div className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /><span>GO — Lancer l'entraînement</span></div>
          <div className="flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5 text-primary" /><span>Journal — Suivi quotidien</span></div>
          <div className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-primary" /><span>Stats — Progression</span></div>
          <div className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-primary" /><span>Exercices — 480+ fiches</span></div>
        </div>
      </Section>

      <Section icon={Bot} title="🤖 Assistant IA — DogWork AI" index={2}>
        <p className="font-medium text-foreground">Votre assistant intelligent est disponible à tout moment !</p>
        <p>Cliquez sur le <Badge variant="outline" className="mx-1 text-xs">💬</Badge> bouton flottant en bas à droite pour ouvrir le chat IA.</p>
        <p className="font-medium mt-2">Ce que l'IA peut faire pour vous :</p>
        <div className="space-y-1.5 mt-1">
          <div className="flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
            <span><strong>Conseils personnalisés</strong> — Posez vos questions sur le comportement de votre chien</span>
          </div>
          <div className="flex items-start gap-2">
            <Target className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
            <span><strong>Aide aux exercices</strong> — Demandez comment réaliser un exercice spécifique</span>
          </div>
          <div className="flex items-start gap-2">
            <HelpCircle className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
            <span><strong>Résolution de problèmes</strong> — « Mon chien tire en laisse, que faire ? »</span>
          </div>
          <div className="flex items-start gap-2">
            <Eye className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
            <span><strong>Compréhension</strong> — « Pourquoi mon chien aboie sur les vélos ? »</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 italic">L'IA ne remplace pas un éducateur professionnel pour les cas de réactivité sévère ou d'agressivité.</p>
      </Section>

      <Section icon={Shield} title="Sécurité et méthode" index={3}>
        <p>DogWork utilise exclusivement des méthodes positives et bienveillantes. Le système adapte automatiquement l'intensité selon le profil de votre chien.</p>
        <p>En cas de morsure déclarée, le plan priorise les exercices de sécurité (muselière, gestion de distance).</p>
      </Section>

      <Section icon={Star} title="Astuces" index={4}>
        <Step n={1} text="Remplissez le journal chaque jour pour un suivi précis." />
        <Step n={2} text="Re-évaluez régulièrement votre chien pour ajuster le plan." />
        <Step n={3} text="Utilisez l'IA pour poser vos questions entre les séances !" />
      </Section>
    </div>
  );
}

/* ─── ONGLET ÉDUCATEUR ─── */
function EducatorGuide() {
  return (
    <div className="space-y-3">
      <Section icon={GraduationCap} title="Accès Éducateur" index={0}>
        <p>Votre compte éducateur est créé par l'administrateur. Vous recevrez un email avec vos identifiants.</p>
        <Step n={1} text="Connectez-vous avec l'email et le mot de passe temporaire reçus." />
        <Step n={2} text="Allez dans Profil → « Espace Éducateur » pour accéder au dashboard pro." />
      </Section>

      <Section icon={Users} title="Gestion des clients" index={1}>
        <div className="space-y-1">
          <p><strong>Dashboard</strong> — KPIs globaux, alertes, chiens sensibles</p>
          <p><strong>Clients</strong> — Liste de vos clients liés</p>
          <p><strong>Chiens</strong> — Fiches détaillées des chiens de vos clients</p>
          <p><strong>Notes</strong> — Observations, alertes et recommandations typées</p>
          <p><strong>Stats</strong> — Statistiques d'activité globales</p>
        </div>
      </Section>

      <Section icon={FileText} title="Cours IRL" index={2}>
        <Step n={1} text="Allez dans l'onglet « Cours » de votre espace éducateur." />
        <Step n={2} text="Créez un cours : titre, catégorie, niveau, prix, durée, lieu." />
        <Step n={3} text="La commission de 30% est calculée automatiquement sur le prix." />
        <p className="mt-1">Exemple : Cours à 50€ → Commission 15€ → Vous recevez 35€</p>
      </Section>

      <Section icon={Bot} title="🤖 Assistant IA — Pour les éducateurs" index={3}>
        <p className="font-medium text-foreground">L'assistant IA est aussi disponible pour vous !</p>
        <p>En tant qu'éducateur, l'IA peut vous aider spécifiquement sur :</p>
        <div className="space-y-1.5 mt-1">
          <div className="flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
            <span><strong>Rédiger des notes</strong> — Demandez à l'IA de vous aider à formuler vos observations</span>
          </div>
          <div className="flex items-start gap-2">
            <Target className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
            <span><strong>Analyser un profil</strong> — « Quels exercices pour un chien réactif aux humains ? »</span>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
            <span><strong>Planification</strong> — Conseils pour structurer des séances de groupe</span>
          </div>
          <div className="flex items-start gap-2">
            <BookOpen className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
            <span><strong>Veille</strong> — Questions sur les dernières approches en éducation canine</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Cliquez sur le bouton 💬 en bas à droite pour ouvrir le chat.</p>
      </Section>
    </div>
  );
}

/* ─── ONGLET ADMIN ─── */
function AdminGuide() {
  return (
    <div className="space-y-3">
      <Section icon={ShieldCheck} title="Accès Administration" index={0}>
        <p>Le dashboard admin est accessible depuis <strong>Profil → Administration</strong>.</p>
        <p>Seuls les comptes avec le rôle admin peuvent y accéder.</p>
      </Section>

      <Section icon={Plus} title="Créer un éducateur" index={1}>
        <Step n={1} text="Dans le dashboard admin, trouvez « Créer un éducateur »." />
        <Step n={2} text="Renseignez l'email, le nom et la spécialité." />
        <Step n={3} text="Le système crée automatiquement le compte + rôle + profil coach." />
      </Section>

      <Section icon={BarChart3} title="Suivi des commissions" index={2}>
        <p>La commission de <strong>30%</strong> est prélevée automatiquement sur chaque cours créé par un éducateur.</p>
        <p>Le dashboard affiche les statistiques globales : nombre d'utilisateurs, chiens, éducateurs et revenus.</p>
      </Section>

      <Section icon={Shield} title="Sécurité" index={3}>
        <p>Seul l'admin peut voir tous les profils, créer des éducateurs et accéder aux stats globales.</p>
        <p>Les éducateurs ne voient que leurs propres clients. Les utilisateurs ne voient que leurs propres chiens.</p>
      </Section>
    </div>
  );
}

export default function HelpPage() {
  const { user } = useAuth();
  const { data: isCoach } = useIsCoach();
  const { data: isAdmin } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return data === true;
    },
    enabled: !!user,
  });

  const defaultTab = isAdmin ? "admin" : isCoach ? "educator" : "user";

  return (
    <AppLayout>
      <div className="pt-6 pb-24 space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Guide d'utilisation</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Découvrez comment tirer le meilleur parti de DogWork selon votre rôle.
        </p>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="user" className="text-xs gap-1">
              <Dog className="h-3.5 w-3.5" /> Utilisateur
            </TabsTrigger>
            <TabsTrigger value="educator" className="text-xs gap-1">
              <GraduationCap className="h-3.5 w-3.5" /> Éducateur
            </TabsTrigger>
            <TabsTrigger value="admin" className="text-xs gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user" className="mt-3">
            <UserGuide />
          </TabsContent>
          <TabsContent value="educator" className="mt-3">
            <EducatorGuide />
          </TabsContent>
          <TabsContent value="admin" className="mt-3">
            <AdminGuide />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
