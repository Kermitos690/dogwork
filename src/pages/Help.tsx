import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dog, Play, BookOpen, BarChart3, ClipboardList, Shield, GraduationCap,
  ShieldCheck, Users, FileText, Plus, Calendar, Sparkles, HelpCircle,
  MessageSquare, Bot, Target, Eye, Zap, PawPrint, Star, Home, Pencil,
  Heart, AlertTriangle, MapPin, Timer, Activity, Settings, Clipboard,
  Video, TrendingUp, Building2, UserCheck, Trash2, Lock, CreditCard,
  Package, Grid3X3, Bell, Send, Search, Download, Upload
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useIsCoach } from "@/hooks/useCoach";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RestartTourButton } from "@/components/GuidedTour";
import { ReadAloudButton } from "@/components/ReadAloudButton";

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

function FeatureRow({ icon: Icon, label, desc }: { icon: any; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
      <span><strong>{label}</strong> — {desc}</span>
    </div>
  );
}

/* ─── ONGLET PROPRIÉTAIRE ─── */
function OwnerGuide() {
  return (
    <div className="space-y-3">
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
        <FeatureRow icon={Sparkles} label="Plan IA personnalisé" desc="Généré par l'IA selon le profil, les problèmes et les objectifs." />
        <FeatureRow icon={BookOpen} label="Programmes prêts à l'emploi" desc="Bibliothèque de 50+ programmes Pro couvrant 19 catégories." />
        <FeatureRow icon={Timer} label="Détail du jour" desc="Exercices, durée, difficulté, critères de validation." />
        <FeatureRow icon={Lock} label="Tiers d'accès" desc="Programmes Starter (gratuits) et Pro (abonnement requis)." />
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
      </Section>

      <Section icon={CreditCard} title="💳 Abonnements" index={10}>
        <FeatureRow icon={Star} label="Gratuit" desc="Programmes Starter, bibliothèque de base, assistant IA limité." />
        <FeatureRow icon={Zap} label="Expert (payant)" desc="Plans IA avancés, 50+ programmes Pro, statistiques détaillées." />
        <p className="text-xs italic">Gérez votre abonnement dans Profil → Abonnement.</p>
      </Section>

      <Section icon={MessageSquare} title="💬 Messagerie" index={11}>
        <FeatureRow icon={Send} label="Contacter votre éducateur" desc="Échangez avec votre éducateur si vous êtes lié(e) à un professionnel." />
        <FeatureRow icon={Bell} label="Notifications" desc="Recevez les messages et alertes de votre éducateur." />
      </Section>

      <Section icon={BookOpen} title="📚 Bibliothèque d'exercices" index={12}>
        <FeatureRow icon={BookOpen} label="480+ exercices" desc="Base de données complète, catégorisée et filtrée." />
        <FeatureRow icon={Eye} label="Fiches détaillées" desc="Étapes, erreurs courantes, précautions, critères de réussite." />
        <FeatureRow icon={Search} label="Filtres avancés" desc="Par catégorie, niveau, type, compatibilité (muselière, chiot…)." />
      </Section>

      <Section icon={Bot} title="🤖 Assistant IA" index={13}>
        <p>Cliquez sur le bouton <Badge variant="outline" className="mx-1 text-xs">💬</Badge> en bas à droite.</p>
        <FeatureRow icon={Sparkles} label="Conseils personnalisés" desc="Posez vos questions sur le comportement de votre chien." />
        <FeatureRow icon={Target} label="Aide aux exercices" desc="Demandez comment réaliser un exercice spécifique." />
        <FeatureRow icon={HelpCircle} label="Résolution" desc="« Mon chien tire en laisse, que faire ? »" />
        <p className="text-xs text-muted-foreground italic">L'IA ne remplace pas un éducateur professionnel pour les cas sévères.</p>
      </Section>

      <Section icon={Shield} title="🛡️ Sécurité" index={14}>
        <p>Consultez la page Sécurité pour les règles d'éducation canine positive :</p>
        <div className="space-y-1 text-xs">
          <span>• Travailler sous le seuil de réactivité</span>
          <span>• Lire les signaux d'apaisement</span>
          <span>• Gestion de la distance</span>
          <span>• Quand arrêter un exercice</span>
        </div>
      </Section>

      <Section icon={Settings} title="⚙️ Profil & Réglages" index={15}>
        <FeatureRow icon={Settings} label="Profil" desc="Nom, avatar, accès aux espaces spéciaux." />
        <FeatureRow icon={Download} label="Export" desc="Exportez vos données en JSON." />
      </Section>
    </div>
  );
}

/* ─── ONGLET ADOPTANT ─── */
function AdopterGuide() {
  return (
    <div className="space-y-3">
      <Section icon={Heart} title="🏡 Bienvenue, adoptant !" index={0}>
        <p className="font-medium text-foreground">Vous venez d'adopter un chien via un refuge partenaire ? DogWork vous accompagne dans cette nouvelle aventure.</p>
        <p>Votre compte est un compte propriétaire classique, mais lié au refuge d'adoption pour un suivi complet.</p>
      </Section>

      <Section icon={PawPrint} title="🚀 Premiers pas après adoption" index={1}>
        <Step n={1} text="Créez votre compte DogWork avec le même email communiqué au refuge." />
        <Step n={2} text="Si votre email correspond, le lien avec le refuge sera créé automatiquement." />
        <Step n={3} text="Ajoutez votre chien adopté via l'onboarding complet (12 étapes)." />
        <Step n={4} text="Renseignez son origine comme « Refuge / SPA » pour un plan adapté." />
        <Step n={5} text="Consultez la fiche d'évaluation pré-adoption réalisée par l'éducateur du refuge." />
      </Section>

      <Section icon={AlertTriangle} title="⚠️ Spécificités chien de refuge" index={2}>
        <FeatureRow icon={Shield} label="Période d'adaptation" desc="Les 2 premières semaines sont cruciales. Respectez le rythme du chien." />
        <FeatureRow icon={Eye} label="Signaux de stress" desc="Halètement, léchage de babines, détournement du regard." />
        <FeatureRow icon={Timer} label="Progressivité" desc="Ne surchargez pas votre chien. Sessions courtes de 5-10 minutes." />
        <FeatureRow icon={Heart} label="Patience" desc="Un chien de refuge peut mettre 3 mois à montrer sa vraie personnalité." />
      </Section>

      <Section icon={Users} title="👥 Vos contacts refuge" index={3}>
        <p>Dans la messagerie, vous trouverez automatiquement :</p>
        <FeatureRow icon={Building2} label="Votre refuge d'adoption" desc="Le refuge apparaît dans vos contacts avec le nom de l'animal adopté." />
        <FeatureRow icon={GraduationCap} label="Éducateur partenaire" desc="Si le refuge a un éducateur partenaire, il peut suivre votre progression." />
        <FeatureRow icon={ShieldCheck} label="Support DogWork" desc="L'administrateur est toujours disponible dans vos contacts." />
        <p className="text-xs italic">Pas besoin de chercher : tous vos contacts liés sont affichés en haut de la messagerie.</p>
      </Section>

      <Section icon={MessageSquare} title="💬 Suivi post-adoption" index={4}>
        <Step n={1} text="Ouvrez la messagerie depuis le menu « Messages »." />
        <Step n={2} text="Cliquez sur le nom du refuge dans la section « Vos contacts »." />
        <Step n={3} text="Envoyez des nouvelles, posez des questions, partagez les progrès." />
        <Step n={4} text="Le refuge peut aussi vous contacter pour le suivi." />
        <FeatureRow icon={Bot} label="Assistant IA" desc="Posez toutes vos questions d'adaptation post-adoption à l'IA." />
      </Section>

      <Section icon={Sparkles} title="✨ Plan personnalisé refuge" index={5}>
        <p>L'IA génère un plan spécialement adapté aux chiens adoptés, tenant compte de :</p>
        <div className="space-y-1 text-xs">
          <span>• L'historique comportemental (si évaluation disponible)</span>
          <span>• Le niveau de réactivité et de peur</span>
          <span>• La socialisation progressive</span>
          <span>• La confiance et le lien avec le nouveau maître</span>
        </div>
      </Section>

      <Section icon={Star} title="💡 Conseils pour réussir" index={6}>
        <Step n={1} text="Installez une routine quotidienne stable (repas, promenades, repos)." />
        <Step n={2} text="Commencez par les exercices de confiance (regard, rappel doux)." />
        <Step n={3} text="Remplissez le journal chaque jour pour suivre l'évolution." />
        <Step n={4} text="Contactez le refuge via la messagerie si vous avez des doutes." />
        <Step n={5} text="N'hésitez pas à consulter un éducateur pour les cas sensibles." />
        <Step n={6} text="Célébrez chaque petit progrès !" />
      </Section>
    </div>
  );
}

/* ─── ONGLET ÉDUCATEUR ─── */
function EducatorGuide() {
  return (
    <div className="space-y-3">
      <Section icon={GraduationCap} title="🎓 Accès Éducateur" index={1}>
        <p>Votre compte éducateur est créé par l'administrateur DogWork.</p>
        <Step n={1} text="Connectez-vous avec l'email et le mot de passe fournis par l'admin." />
        <Step n={2} text="Allez dans Profil → « Espace Éducateur » pour accéder au dashboard pro." />
        <Step n={3} text="Complétez votre profil éducateur (nom, spécialité, bio)." />
      </Section>

      <Section icon={CreditCard} title="💳 Cotisation annuelle" index={2}>
        <p>L'accès à l'espace éducateur nécessite un abonnement actif de <strong>200 CHF/an</strong>.</p>
        <Step n={1} text="Accédez à l'onglet Abonnement de l'espace éducateur." />
        <Step n={2} text="Procédez au paiement via Stripe (CB acceptée)." />
        <Step n={3} text="L'accès est immédiat après validation du paiement." />
        <p className="text-xs italic">Sans abonnement actif, vous êtes redirigé vers la page de cotisation.</p>
      </Section>

      <Section icon={Home} title="📊 Dashboard Éducateur" index={3}>
        <FeatureRow icon={Activity} label="KPIs globaux" desc="Nombre de clients, chiens suivis, alertes actives." />
        <FeatureRow icon={AlertTriangle} label="Alertes" desc="Notifications automatiques pour les chiens en difficulté." />
        <FeatureRow icon={Dog} label="Chiens sensibles" desc="Liste des chiens nécessitant une attention particulière." />
      </Section>

      <Section icon={Users} title="👥 Gestion des clients" index={4}>
        <FeatureRow icon={Plus} label="Ajouter un client" desc="Liez un client par son email. Le client reçoit une demande à accepter." />
        <FeatureRow icon={Eye} label="Accès complet" desc="Consultez les profils, journaux, logs comportementaux et évaluations." />
        <FeatureRow icon={FileText} label="Historique" desc="Tout l'historique d'entraînement et de progression." />
      </Section>

      <Section icon={Dog} title="🐕 Fiches chien" index={5}>
        <FeatureRow icon={Clipboard} label="Profil complet" desc="Santé, comportement, évaluation, plan actif." />
        <FeatureRow icon={BarChart3} label="Progression" desc="Graphiques de progression et tendances." />
        <FeatureRow icon={Pencil} label="Ajustements" desc="Proposez des modifications au plan d'entraînement." />
      </Section>

      <Section icon={FileText} title="📝 Notes professionnelles" index={6}>
        <FeatureRow icon={Pencil} label="Créer des notes" desc="Observations, recommandations, alertes par client ou chien." />
        <FeatureRow icon={Dog} label="Sélection animale" desc="Ciblez un chien client 🐕 ou un pensionnaire refuge 🏠." />
        <FeatureRow icon={AlertTriangle} label="Priorités" desc="Normal, important, urgent — classez vos notes." />
      </Section>

      <Section icon={Calendar} title="📅 Calendrier" index={7}>
        <FeatureRow icon={Plus} label="Créer un événement" desc="Rendez-vous, cours de groupe, évaluation, disponibilité." />
        <FeatureRow icon={Dog} label="Lier un chien" desc="Associez un chien client ou refuge à chaque événement." />
        <FeatureRow icon={MapPin} label="Lieu" desc="Ajoutez le lieu de la séance pour la planification." />
      </Section>

      <Section icon={MapPin} title="📍 Cours en présentiel" index={8}>
        <Step n={1} text="Allez dans l'onglet « Cours » de votre espace éducateur." />
        <Step n={2} text="Créez un cours : titre, catégorie, niveau, prix, durée, lieu." />
        <Step n={3} text="La commission de 15.8% est prélevée automatiquement." />
        <p className="mt-1 text-xs">Exemple : Cours à 50 CHF → Commission 7.90 CHF → Vous recevez 42.10 CHF</p>
      </Section>

      <Section icon={CreditCard} title="💰 Stripe Connect" index={9}>
        <Step n={1} text="Dans Abonnement → section Stripe Connect, cliquez « Activer »." />
        <Step n={2} text="Complétez l'onboarding Stripe (identité, compte bancaire)." />
        <Step n={3} text="Les paiements des cours sont versés automatiquement sur votre compte." />
        <FeatureRow icon={Eye} label="Dashboard Stripe" desc="Accédez à votre tableau de bord Stripe pour le suivi financier." />
      </Section>

      <Section icon={Building2} title="🏠 Partenariat refuge" index={10}>
        <p>Vous pouvez être invité par un refuge pour réaliser des évaluations comportementales pré-adoption.</p>
        <FeatureRow icon={ClipboardList} label="Évaluations" desc="Remplissez la grille complète : sociabilité, réactivité, morsure, énergie." />
        <FeatureRow icon={Bell} label="Notification" desc="Le refuge est automatiquement notifié de chaque évaluation." />
        <FeatureRow icon={FileText} label="Notes refuge" desc="Ajoutez des notes spécifiques aux animaux du refuge." />
      </Section>

      <Section icon={Bot} title="🤖 IA pour éducateurs" index={11}>
        <FeatureRow icon={Sparkles} label="Rédiger des notes" desc="L'IA vous aide à formuler vos observations." />
        <FeatureRow icon={Target} label="Analyser un profil" desc="« Quels exercices pour un chien réactif ? »" />
        <FeatureRow icon={BookOpen} label="Veille" desc="Questions sur les approches en éducation canine." />
      </Section>
    </div>
  );
}

/* ─── ONGLET REFUGE / SPA ─── */
function ShelterGuide() {
  return (
    <div className="space-y-3">
      <Section icon={Building2} title="🏠 Accès Refuge / SPA" index={0}>
        <p>Votre compte refuge est créé par l'administrateur DogWork.</p>
        <Step n={1} text="Connectez-vous avec les identifiants fournis par l'admin." />
        <Step n={2} text="Vous accédez directement à l'espace refuge dédié." />
        <Step n={3} text="Complétez votre profil d'organisation (nom, adresse, téléphone)." />
      </Section>

      <Section icon={CreditCard} title="💳 Abonnement refuge" index={1}>
        <p>L'accès à l'espace refuge nécessite un abonnement de <strong>500 CHF/an</strong>.</p>
        <Step n={1} text="Accédez à Abonnement dans le menu refuge." />
        <Step n={2} text="Procédez au paiement pour activer toutes les fonctionnalités." />
      </Section>

      <Section icon={Home} title="📊 Dashboard refuge" index={2}>
        <FeatureRow icon={Dog} label="Animaux" desc="Nombre total d'animaux, répartition par statut." />
        <FeatureRow icon={Users} label="Employés" desc="Équipe active et rôles attribués." />
        <FeatureRow icon={Activity} label="Activité récente" desc="Dernières actions enregistrées par l'équipe." />
        <FeatureRow icon={TrendingUp} label="Statistiques" desc="Taux d'adoption, durée moyenne de séjour." />
      </Section>

      <Section icon={Dog} title="🐕 Gestion des animaux" index={3}>
        <FeatureRow icon={Plus} label="Ajouter un animal" desc="Nom, espèce, race, âge estimé, poids, puce, santé." />
        <FeatureRow icon={Upload} label="Photo" desc="Ajoutez une photo de l'animal." />
        <FeatureRow icon={Pencil} label="Statuts" desc="Arrivée → En soin → Disponible → Réservé → Adopté → Parti." />
        <FeatureRow icon={Heart} label="Adoption" desc="Renseignez les informations de l'adoptant (nom, email)." />
        <FeatureRow icon={MessageSquare} label="Observations" desc="Ajoutez des observations quotidiennes par animal." />
      </Section>

      <Section icon={Grid3X3} title="🗺️ Gestion des espaces" index={4}>
        <FeatureRow icon={Plus} label="Créer des espaces" desc="Boxes, enclos, infirmerie, quarantaine — sur une grille 2D." />
        <FeatureRow icon={Dog} label="Attribution" desc="Assignez un animal à chaque espace." />
        <FeatureRow icon={Eye} label="Vue globale" desc="Visualisez l'occupation de votre refuge en un coup d'œil." />
      </Section>

      <Section icon={Users} title="👥 Gestion des employés" index={5}>
        <Step n={1} text="Allez dans « Employés » dans le menu refuge." />
        <Step n={2} text="Ajoutez un employé : nom, email, rôle, titre de poste." />
        <Step n={3} text="Un code PIN est généré automatiquement pour la connexion." />
        <Step n={4} text="L'employé reçoit ses identifiants par email." />
        <FeatureRow icon={Lock} label="Isolation" desc="Chaque employé ne voit que les données de son refuge." />
        <FeatureRow icon={Pencil} label="Rôles" desc="Soigneur, responsable, bénévole — chaque rôle a ses accès." />
      </Section>

      <Section icon={GraduationCap} title="🎓 Éducateurs partenaires" index={6}>
        <Step n={1} text="Allez dans « Éducateurs » dans le menu refuge." />
        <Step n={2} text="Invitez un éducateur par son identifiant utilisateur." />
        <Step n={3} text="L'éducateur partenaire peut réaliser des évaluations comportementales." />
        <FeatureRow icon={ClipboardList} label="Évaluations" desc="Les évaluations apparaissent sur la fiche de l'animal." />
        <FeatureRow icon={Bell} label="Notifications" desc="Recevez un message automatique à chaque évaluation." />
      </Section>

      <Section icon={Activity} title="📋 Journal d'activité" index={7}>
        <p>Toutes les actions sont enregistrées automatiquement :</p>
        <div className="space-y-1 text-xs">
          <span>• Ajout/modification d'un animal</span>
          <span>• Observations et soins</span>
          <span>• Activités des employés</span>
          <span>• Mouvements d'animaux entre espaces</span>
        </div>
      </Section>

      <Section icon={MessageSquare} title="💬 Messagerie" index={8}>
        <FeatureRow icon={Send} label="Communication" desc="Échangez avec vos éducateurs partenaires et l'administrateur." />
        <FeatureRow icon={Bell} label="Alertes" desc="Recevez les notifications d'évaluations et mises à jour." />
      </Section>

      <Section icon={BarChart3} title="📊 Statistiques" index={9}>
        <FeatureRow icon={TrendingUp} label="Adoptions" desc="Nombre d'adoptions par mois, taux de succès." />
        <FeatureRow icon={Timer} label="Durée de séjour" desc="Durée moyenne de séjour par animal." />
        <FeatureRow icon={Dog} label="Répartition" desc="Par espèce, statut, âge." />
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
        <p>Seul le compte administrateur peut y accéder.</p>
      </Section>

      <Section icon={BarChart3} title="📊 Dashboard Admin" index={1}>
        <FeatureRow icon={Users} label="Utilisateurs" desc="Nombre total d'utilisateurs inscrits, par rôle." />
        <FeatureRow icon={Dog} label="Chiens" desc="Nombre total de chiens enregistrés." />
        <FeatureRow icon={GraduationCap} label="Éducateurs" desc="Liste et gestion des éducateurs actifs." />
        <FeatureRow icon={Building2} label="Refuges" desc="Liste et gestion des refuges/SPA." />
        <FeatureRow icon={BookOpen} label="Exercices" desc="480+ exercices dans la bibliothèque." />
      </Section>

      <Section icon={Plus} title="➕ Créer un éducateur" index={2}>
        <Step n={1} text="Dans le dashboard admin, section « Créer un éducateur »." />
        <Step n={2} text="Renseignez l'email, le nom et la spécialité." />
        <Step n={3} text="Le système crée le compte + rôle + profil coach automatiquement." />
        <Step n={4} text="L'éducateur reçoit un email avec ses identifiants." />
        <p className="text-xs italic">Cotisation éducateur : 200 CHF/an</p>
      </Section>

      <Section icon={Building2} title="🏠 Créer un refuge / SPA" index={3}>
        <Step n={1} text="Dans le dashboard admin, section « Créer un refuge »." />
        <Step n={2} text="Renseignez l'email, le nom de l'organisation et le type." />
        <Step n={3} text="Le compte refuge est créé avec tous les accès nécessaires." />
        <p className="text-xs italic">Abonnement refuge : 500 CHF/an</p>
      </Section>

      <Section icon={CreditCard} title="💰 Trésorerie & Stripe Connect" index={4}>
        <FeatureRow icon={Activity} label="Solde global" desc="Visualisez le solde et les transactions de la plateforme." />
        <FeatureRow icon={Users} label="Éducateurs connectés" desc="Statut Stripe Connect de chaque éducateur." />
        <FeatureRow icon={TrendingUp} label="Commissions" desc="15.8% prélevés automatiquement sur chaque cours." />
        <FeatureRow icon={Eye} label="Dashboard Stripe" desc="Accédez au tableau de bord Stripe de la plateforme." />
      </Section>

      <Section icon={BookOpen} title="📚 Gestion des cours" index={5}>
        <FeatureRow icon={Eye} label="Tous les cours" desc="Visualisez tous les cours créés par les éducateurs." />
        <FeatureRow icon={UserCheck} label="Approbation" desc="Approuvez ou rejetez les cours soumis par les éducateurs." />
        <FeatureRow icon={Pencil} label="Modification" desc="Modifiez les détails de n'importe quel cours." />
        <FeatureRow icon={Trash2} label="Suppression" desc="Supprimez les cours inappropriés." />
      </Section>

      <Section icon={Trash2} title="🗑️ Gestion des données" index={6}>
        <p className="font-medium text-foreground">L'administrateur a un accès complet en lecture, modification et suppression sur toutes les tables :</p>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <span>• Chiens & profils</span>
          <span>• Plans d'entraînement</span>
          <span>• Journaux & logs</span>
          <span>• Évaluations</span>
          <span>• Messages</span>
          <span>• Cours & réservations</span>
          <span>• Animaux refuge</span>
          <span>• Employés refuge</span>
          <span>• Notes éducateur</span>
          <span>• Alertes pro</span>
          <span>• Exercices</span>
          <span>• Rôles utilisateurs</span>
        </div>
        <p className="text-xs text-destructive mt-2 font-medium">⚠️ Les suppressions sont définitives. Vérifiez avant de supprimer.</p>
      </Section>

      <Section icon={Lock} title="🔒 Autorisations par rôle" index={7}>
        <div className="space-y-2">
          <div className="p-2 bg-muted/50 rounded text-xs">
            <p className="font-medium text-foreground">👤 Propriétaire (owner)</p>
            <p>Voit et gère uniquement ses propres chiens, plans, journaux. Peut contacter son éducateur.</p>
          </div>
          <div className="p-2 bg-muted/50 rounded text-xs">
            <p className="font-medium text-foreground">🎓 Éducateur (educator)</p>
            <p>Accède aux données de ses clients liés. Gère ses notes, cours, calendrier. Partenariat refuge possible.</p>
          </div>
          <div className="p-2 bg-muted/50 rounded text-xs">
            <p className="font-medium text-foreground">🏠 Refuge (shelter)</p>
            <p>Gère ses animaux, employés, espaces, observations. Isolé des autres refuges.</p>
          </div>
          <div className="p-2 bg-muted/50 rounded text-xs">
            <p className="font-medium text-foreground">👷 Employé refuge (shelter_employee)</p>
            <p>Accède uniquement aux données de son refuge. Peut logger des activités et observations.</p>
          </div>
          <div className="p-2 bg-primary/10 rounded text-xs border border-primary/20">
            <p className="font-medium text-foreground">🔐 Administrateur (admin)</p>
            <p>Accès transverse à toutes les données. Crée les comptes éducateurs et refuges. Gère la trésorerie et les commissions. Peut supprimer n'importe quelle donnée.</p>
          </div>
        </div>
      </Section>

      <Section icon={Shield} title="🛡️ Architecture de sécurité" index={8}>
        <FeatureRow icon={Lock} label="RLS (Row Level Security)" desc="Chaque table est protégée par des politiques d'accès granulaires." />
        <FeatureRow icon={UserCheck} label="Fonctions de rôle" desc="is_admin(), is_educator(), is_shelter() vérifient les rôles." />
        <FeatureRow icon={Shield} label="Isolation" desc="Les données de chaque refuge sont strictement isolées." />
        <FeatureRow icon={Eye} label="Admin transverse" desc="L'admin contourne les gardes de rôle pour la supervision." />
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
      const { data } = await supabase.rpc("is_admin");
      return data === true;
    },
    enabled: !!user,
  });
  const { data: isShelter } = useQuery({
    queryKey: ["is_shelter", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_shelter");
      return data === true;
    },
    enabled: !!user,
  });

  const defaultTab = isAdmin ? "admin" : isCoach ? "educator" : isShelter ? "shelter" : "owner";

  return (
    <AppLayout>
      <div className="pb-24 space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Guide d'utilisation</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Découvrez comment tirer le meilleur parti de DogWork selon votre rôle.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <RestartTourButton />
          <ReadAloudButton
            getText={() => {
              const el = document.querySelector('[role="tabpanel"]:not([hidden])');
              return el?.textContent || "Contenu non disponible";
            }}
            label="Écouter cette page"
          />
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="owner" className="text-[10px] gap-0.5 px-1">
              <Dog className="h-3 w-3" /> Proprio
            </TabsTrigger>
            <TabsTrigger value="adopter" className="text-[10px] gap-0.5 px-1">
              <Heart className="h-3 w-3" /> Adoptant
            </TabsTrigger>
            <TabsTrigger value="educator" className="text-[10px] gap-0.5 px-1">
              <GraduationCap className="h-3 w-3" /> Éduc.
            </TabsTrigger>
            <TabsTrigger value="shelter" className="text-[10px] gap-0.5 px-1">
              <Building2 className="h-3 w-3" /> Refuge
            </TabsTrigger>
            <TabsTrigger value="admin" className="text-[10px] gap-0.5 px-1">
              <ShieldCheck className="h-3 w-3" /> Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="owner" className="mt-3">
            <OwnerGuide />
          </TabsContent>
          <TabsContent value="adopter" className="mt-3">
            <AdopterGuide />
          </TabsContent>
          <TabsContent value="educator" className="mt-3">
            <EducatorGuide />
          </TabsContent>
          <TabsContent value="shelter" className="mt-3">
            <ShelterGuide />
          </TabsContent>
          <TabsContent value="admin" className="mt-3">
            <AdminGuide />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
