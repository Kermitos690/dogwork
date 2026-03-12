import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dog, Play, BookOpen, BarChart3, ClipboardList, Shield, GraduationCap,
  ShieldCheck, Users, FileText, Plus, Calendar, Sparkles, HelpCircle,
  MessageSquare, Bot, Target, Eye, Zap, PawPrint, Star, Home, Pencil,
  Heart, AlertTriangle, MapPin, Timer, Activity, Settings, Clipboard,
  Video, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useIsCoach } from "@/hooks/useCoach";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import promoVideo from "@/assets/promo-video.mp4";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.3 } }),
};

function Section({ icon: Icon, title, children, index = 0 }: { icon: any; title: string; children: React.ReactNode; index?: number }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" custom={index}>
      <Card    className="border-border/50">
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

function FeatureRow({ icon: Icon, label, desc }: { icon: any; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
      <span><strong>{label}</strong> — {desc}</span>
    </div>
  );
}

/* ─── VIDÉO PROMO ─── */
function PromoSection() {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
      <Card className="border-primary/30 bg-primary/5 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Découvrir DogWork en vidéo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <video
            src={promoVideo}
            controls
            playsInline
            preload="metadata"
            className="w-full rounded-lg shadow-lg"
            poster=""
          >
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Présentation rapide de l'application et de ses fonctionnalités
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── ONGLET UTILISATEUR ─── */
function UserGuide() {
  return (
    <div className="space-y-3">
      <PromoSection />

      <Section icon={PawPrint} title="🚀 Premiers pas" index={1}>
        <Step n={1} text="Créez votre compte avec email + mot de passe, puis confirmez par email." />
        <Step n={2} text="Suivez l'onboarding en 12 étapes : identité du chien, santé, évaluation comportementale, objectifs." />
        <Step n={3} text="Cliquez « Générer mon plan » pour obtenir un programme 100% personnalisé." />
        <Step n={4} text="Accédez au Dashboard pour commencer votre première séance." />
      </Section>

      <Section icon={Home} title="🏠 Dashboard (Accueil)" index={2}>
        <FeatureRow icon={Eye} label="Vue d'ensemble" desc="Progression globale, jour actuel, état du plan." />
        <FeatureRow icon={Zap} label="Action du jour" desc="Bouton pour lancer la séance du jour en un clic." />
        <FeatureRow icon={Activity} label="Dernières activités" desc="Résumé du journal et des sessions récentes." />
        <FeatureRow icon={AlertTriangle} label="Alertes sécurité" desc="Avertissements si morsure déclarée ou muselière requise." />
        <FeatureRow icon={Sparkles} label="Suggestions adaptatives" desc="L'IA analyse votre progression et propose des ajustements." />
      </Section>

      <Section icon={Dog} title="🐕 Gestion des chiens" index={3}>
        <FeatureRow icon={Plus} label="Ajouter un chien" desc="Créez le profil complet : race, âge, poids, santé, comportement." />
        <FeatureRow icon={Pencil} label="Modifier le profil" desc="Mettez à jour les infos, ajoutez une photo, gérez la santé." />
        <FeatureRow icon={Star} label="Chien actif" desc="Activez le chien sur lequel vous travaillez actuellement." />
        <p className="text-xs italic">Vous pouvez gérer plusieurs chiens avec des plans indépendants.</p>
      </Section>

      <Section icon={ClipboardList} title="📋 Évaluation comportementale" index={4}>
        <p>Un questionnaire en 6 étapes couvrant :</p>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <span>• Obéissance de base</span>
          <span>• Réactivité (chiens/humains)</span>
          <span>• Gestion de la laisse</span>
          <span>• Tolérance à la frustration</span>
          <span>• Sensibilité au bruit</span>
          <span>• Distance de confort</span>
        </div>
        <p className="text-xs italic">Cette évaluation permet à l'IA de calibrer votre plan personnalisé.</p>
      </Section>

      <Section icon={AlertTriangle} title="⚠️ Problèmes & Objectifs" index={5}>
        <FeatureRow icon={AlertTriangle} label="Problèmes" desc="Sélectionnez les comportements gênants (aboiements, tirages, réactivité…)" />
        <FeatureRow icon={Target} label="Objectifs" desc="Définissez vos priorités : marche en laisse, socialisation, rappel…" />
        <p className="text-xs italic">Plus vous êtes précis, plus le plan sera adapté.</p>
      </Section>

      <Section icon={Calendar} title="📅 Plan d'entraînement" index={6}>
        <FeatureRow icon={Sparkles} label="Plan personnalisé" desc="Généré par l'IA selon le profil, les problèmes et les objectifs." />
        <FeatureRow icon={BookOpen} label="Plan standard" desc="Programme de 28 jours progressif disponible pour tous." />
        <FeatureRow icon={Timer} label="Détail du jour" desc="Exercices, durée, difficulté, critères de validation." />
        <FeatureRow icon={Pencil} label="Notes" desc="Ajoutez des notes personnelles sur chaque journée." />
      </Section>

      <Section icon={Play} title="▶️ Entraînement (GO)" index={7}>
        <FeatureRow icon={Timer} label="Timer intégré" desc="Chronomètre pour chaque exercice avec gestion du temps." />
        <FeatureRow icon={Activity} label="Compteur de répétitions" desc="Suivez le nombre de répétitions effectuées." />
        <FeatureRow icon={Target} label="Navigation exercices" desc="Passez d'un exercice à l'autre avec les boutons précédent/suivant." />
        <FeatureRow icon={Star} label="Validation" desc="Marquez chaque exercice comme terminé pour suivre la progression." />
      </Section>

      <Section icon={Clipboard} title="📓 Journal quotidien" index={8}>
        <p>Après chaque séance, renseignez :</p>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <span>• Niveau de tension</span>
          <span>• Qualité de focus</span>
          <span>• Qualité de marche</span>
          <span>• Réaction aux déclencheurs</span>
          <span>• Incidents éventuels</span>
          <span>• Notes libres</span>
        </div>
      </Section>

      <Section icon={BarChart3} title="📊 Statistiques" index={9}>
        <FeatureRow icon={TrendingUp} label="KPIs" desc="Taux de complétion, jours consécutifs, temps total." />
        <FeatureRow icon={Activity} label="Graphiques" desc="Évolution de la tension, réactivité, distance de confort." />
        <FeatureRow icon={Star} label="Score global" desc="Note globale calculée sur l'ensemble de vos données." />
        <FeatureRow icon={Target} label="Recommandations" desc="Suggestions personnalisées basées sur vos tendances." />
      </Section>

      <Section icon={BookOpen} title="📚 Bibliothèque d'exercices" index={10}>
        <FeatureRow icon={BookOpen} label="480+ exercices" desc="Base de données complète, catégorisée et filtrée." />
        <FeatureRow icon={Eye} label="Fiches détaillées" desc="Étapes, erreurs courantes, précautions, critères de réussite." />
        <FeatureRow icon={Shield} label="Filtres avancés" desc="Par catégorie, niveau, type, compatibilité (muselière, chiot…)." />
      </Section>

      <Section icon={Shield} title="🛡️ Sécurité" index={11}>
        <p>Page dédiée aux règles de sécurité pour l'éducation canine positive :</p>
        <div className="space-y-1 text-xs">
          <span>• Travailler sous le seuil de réactivité</span>
          <span>• Lire les signaux d'apaisement</span>
          <span>• Gestion de la distance</span>
          <span>• Quand arrêter un exercice</span>
          <span>• Règles pour les cas de morsure</span>
        </div>
      </Section>

      <Section icon={Bot} title="🤖 Assistant IA — DogWork AI" index={12}>
        <p className="font-medium text-foreground">Votre assistant intelligent est disponible à tout moment !</p>
        <p>Cliquez sur le <Badge variant="outline" className="mx-1 text-xs">💬</Badge> bouton flottant en bas à droite.</p>
        <p className="font-medium mt-2">Ce que l'IA peut faire :</p>
        <FeatureRow icon={Sparkles} label="Conseils personnalisés" desc="Posez vos questions sur le comportement de votre chien." />
        <FeatureRow icon={Target} label="Aide aux exercices" desc="Demandez comment réaliser un exercice spécifique." />
        <FeatureRow icon={HelpCircle} label="Résolution de problèmes" desc="« Mon chien tire en laisse, que faire ? »" />
        <FeatureRow icon={Eye} label="Compréhension" desc="« Pourquoi mon chien aboie sur les vélos ? »" />
        <FeatureRow icon={BookOpen} label="Éducation" desc="Apprenez les bases du renforcement positif." />
        <p className="text-xs text-muted-foreground mt-2 italic">L'IA ne remplace pas un éducateur professionnel pour les cas sévères.</p>
      </Section>

      <Section icon={Settings} title="⚙️ Profil & Réglages" index={13}>
        <FeatureRow icon={Settings} label="Profil" desc="Gérez votre nom, avatar, et accédez aux espaces spéciaux." />
        <FeatureRow icon={Heart} label="Rappels" desc="Configurez des notifications quotidiennes." />
        <FeatureRow icon={FileText} label="Export" desc="Exportez vos données en JSON ou texte." />
      </Section>

      <Section icon={Star} title="💡 Astuces pour progresser" index={14}>
        <Step n={1} text="Remplissez le journal chaque jour pour un suivi précis." />
        <Step n={2} text="Re-évaluez votre chien toutes les 2 semaines pour ajuster le plan." />
        <Step n={3} text="Utilisez l'IA pour poser vos questions entre les séances." />
        <Step n={4} text="Consultez les stats régulièrement pour voir vos progrès." />
        <Step n={5} text="En cas de régression, ne paniquez pas : revenez au dernier jour réussi." />
      </Section>
    </div>
  );
}

/* ─── ONGLET ÉDUCATEUR ─── */
function EducatorGuide() {
  return (
    <div className="space-y-3">
      <PromoSection />

      <Section icon={GraduationCap} title="🎓 Accès Éducateur" index={1}>
        <p>Votre compte éducateur est créé par l'administrateur. Vous recevrez un email avec vos identifiants.</p>
        <Step n={1} text="Connectez-vous avec l'email et le mot de passe temporaire reçus." />
        <Step n={2} text="Allez dans Profil → « Espace Éducateur » pour accéder au dashboard pro." />
      </Section>

      <Section icon={Home} title="📊 Dashboard Éducateur" index={2}>
        <FeatureRow icon={Activity} label="KPIs globaux" desc="Nombre de clients, chiens suivis, alertes actives." />
        <FeatureRow icon={AlertTriangle} label="Alertes" desc="Notifications automatiques pour les chiens en difficulté." />
        <FeatureRow icon={Dog} label="Chiens sensibles" desc="Liste des chiens nécessitant une attention particulière." />
      </Section>

      <Section icon={Users} title="👥 Gestion des clients" index={3}>
        <FeatureRow icon={Plus} label="Ajouter un client" desc="Liez un client par son email pour accéder à ses données." />
        <FeatureRow icon={Eye} label="Voir les profils" desc="Consultez le profil complet de chaque chien de vos clients." />
        <FeatureRow icon={FileText} label="Historique" desc="Accédez à l'historique d'entraînement et aux journaux." />
      </Section>

      <Section icon={Dog} title="🐕 Fiches chien" index={4}>
        <FeatureRow icon={Clipboard} label="Profil complet" desc="Toutes les informations du chien : santé, comportement, évaluation." />
        <FeatureRow icon={BarChart3} label="Progression" desc="Graphiques de progression et tendances comportementales." />
        <FeatureRow icon={Calendar} label="Plan d'entraînement" desc="Consultez et ajustez le plan de vos clients." />
      </Section>

      <Section icon={FileText} title="📝 Notes professionnelles" index={5}>
        <FeatureRow icon={Pencil} label="Créer des notes" desc="Observations, recommandations, alertes par client/chien." />
        <FeatureRow icon={AlertTriangle} label="Niveaux de priorité" desc="Classez vos notes par importance (normal, important, urgent)." />
        <FeatureRow icon={Target} label="Types de notes" desc="Observation, recommandation, alerte, suivi." />
      </Section>

      <Section icon={MapPin} title="📍 Cours en présentiel" index={6}>
        <Step n={1} text="Allez dans l'onglet « Cours » de votre espace éducateur." />
        <Step n={2} text="Créez un cours : titre, catégorie, niveau, prix, durée, lieu." />
        <Step n={3} text="La commission de 30% est calculée automatiquement sur le prix." />
        <p className="mt-1 text-xs">Exemple : Cours à 50€ → Commission 15€ → Vous recevez 35€</p>
        <FeatureRow icon={Calendar} label="Planification" desc="Définissez la prochaine session et le nombre max de participants." />
      </Section>

      <Section icon={BarChart3} title="📈 Statistiques pro" index={7}>
        <FeatureRow icon={TrendingUp} label="Vue globale" desc="Statistiques d'activité sur l'ensemble de vos clients." />
        <FeatureRow icon={Activity} label="Engagement" desc="Taux de complétion moyen de vos clients." />
      </Section>

      <Section icon={Bot} title="🤖 IA pour les éducateurs" index={8}>
        <p className="font-medium text-foreground">L'assistant IA est aussi disponible pour vous !</p>
        <FeatureRow icon={Sparkles} label="Rédiger des notes" desc="Demandez à l'IA de vous aider à formuler vos observations." />
        <FeatureRow icon={Target} label="Analyser un profil" desc="« Quels exercices pour un chien réactif aux humains ? »" />
        <FeatureRow icon={FileText} label="Planification" desc="Conseils pour structurer des séances de groupe." />
        <FeatureRow icon={BookOpen} label="Veille" desc="Questions sur les dernières approches en éducation canine." />
        <p className="text-xs text-muted-foreground mt-2">Cliquez sur le bouton 💬 en bas à droite pour ouvrir le chat.</p>
      </Section>
    </div>
  );
}

/* ─── ONGLET ADMIN ─── */
function AdminGuide() {
  return (
    <div className="space-y-3">
      <Section icon={ShieldCheck} title="🔐 Accès Administration" index={0}>
        <p>Le dashboard admin est accessible depuis <strong>Profil → Administration</strong>.</p>
        <p>Seuls les comptes avec le rôle admin peuvent y accéder.</p>
      </Section>

      <Section icon={BarChart3} title="📊 Dashboard Admin" index={1}>
        <FeatureRow icon={Users} label="Utilisateurs" desc="Nombre total d'utilisateurs inscrits." />
        <FeatureRow icon={Dog} label="Chiens" desc="Nombre total de chiens enregistrés." />
        <FeatureRow icon={GraduationCap} label="Éducateurs" desc="Liste et gestion des éducateurs." />
        <FeatureRow icon={BookOpen} label="Exercices" desc="Nombre d'exercices dans la bibliothèque." />
      </Section>

      <Section icon={Plus} title="➕ Créer un éducateur" index={2}>
        <Step n={1} text="Dans le dashboard admin, trouvez « Créer un éducateur »." />
        <Step n={2} text="Renseignez l'email, le nom et la spécialité." />
        <Step n={3} text="Le système crée automatiquement le compte + rôle + profil coach." />
      </Section>

      <Section icon={Activity} title="💰 Suivi des commissions" index={3}>
        <p>La commission de <strong>30%</strong> est prélevée automatiquement sur chaque cours.</p>
        <p>Le dashboard affiche les statistiques globales de revenus.</p>
      </Section>

      <Section icon={Shield} title="🛡️ Sécurité & Accès" index={4}>
        <p>Seul l'admin peut voir tous les profils, créer des éducateurs et accéder aux stats globales.</p>
        <p>Les éducateurs ne voient que leurs propres clients. Les utilisateurs ne voient que leurs propres chiens.</p>
        <p className="text-xs italic">Les rôles sont gérés dans une table dédiée avec RLS.</p>
      </Section>
    </div>
  );
}

import { RestartTourButton } from "@/components/GuidedTour";
import { ReadAloudButton } from "@/components/ReadAloudButton";

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
          Découvrez comment tirer le meilleur parti de DogWork selon votre rôle. Parcourez chaque section pour tout comprendre.
        </p>
        <RestartTourButton />

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
