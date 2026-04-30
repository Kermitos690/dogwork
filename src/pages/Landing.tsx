import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Brain, Calendar, ShieldCheck, Users, PawPrint, BarChart3,
  Building2, GraduationCap, Star, ArrowRight, CheckCircle2,
  Zap, Sparkles, Crown, Heart, Mail, Bot, MessageCircle,
  Wand2, LineChart, Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import heroStaffie from "@/assets/hero-staffie.jpg";
import staffieTraining from "@/assets/staffie-training.jpg";
import staffieFamily from "@/assets/staffie-family.jpg";
import logoDogwork from "@/assets/logo-dogwork.png";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: "easeOut" as const },
  }),
};

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const AI_CAPABILITIES = [
    {
      icon: Bot,
      title: "Chatbot IA 24/7",
      desc: "Posez n'importe quelle question sur votre chien. L'IA connaît son profil, sa race, ses problématiques et son historique.",
      cost: "1 crédit / message",
    },
    {
      icon: Wand2,
      title: "Plan éducatif IA personnalisé",
      desc: "Génération d'un plan d'entraînement sur mesure selon le profil, les problèmes et les objectifs de votre chien.",
      cost: "8 crédits / plan",
    },
    {
      icon: LineChart,
      title: "Analyse comportementale",
      desc: "L'IA analyse votre journal et vos évaluations pour détecter les tendances et recommander des ajustements.",
      cost: "13 crédits / analyse",
    },
    {
      icon: Sparkles,
      title: "Analyse de profil chien",
      desc: "Synthèse intelligente du profil de votre chien : forces, axes de travail, recommandations adaptées à sa race et son âge.",
      cost: "13 crédits / analyse",
    },
  ];

  const FEATURES = [
    { icon: Brain, title: t("landing.feat1Title"), desc: t("landing.feat1Desc"), color: "text-primary" },
    { icon: BarChart3, title: t("landing.feat2Title"), desc: t("landing.feat2Desc"), color: "text-accent" },
    { icon: Building2, title: t("landing.feat3Title"), desc: t("landing.feat3Desc"), color: "text-[hsl(var(--success))]" },
    { icon: GraduationCap, title: t("landing.feat4Title"), desc: t("landing.feat4Desc"), color: "text-[hsl(40,95%,55%)]" },
    { icon: Calendar, title: t("landing.feat5Title"), desc: t("landing.feat5Desc"), color: "text-primary" },
    { icon: ShieldCheck, title: t("landing.feat6Title"), desc: t("landing.feat6Desc"), color: "text-destructive" },
  ];

  const TESTIMONIALS = [
    { name: t("landing.testimonial1Name"), role: t("landing.testimonial1Role"), text: t("landing.testimonial1Text"), rating: 5 },
    { name: t("landing.testimonial2Name"), role: t("landing.testimonial2Role"), text: t("landing.testimonial2Text"), rating: 5 },
    { name: t("landing.testimonial3Name"), role: t("landing.testimonial3Role"), text: t("landing.testimonial3Text"), rating: 5 },
  ];

  const STATS = [
    { num: "IA", label: "Coach intelligent intégré" },
    { num: "480+", label: "Exercices enrichis" },
    { num: "28", label: "Jours de programme" },
    { num: "0 CHF", label: "Pour démarrer" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ========== NAV ========== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoDogwork} alt="DogWork" className="w-9 h-9 rounded-lg" />
            <span className="text-xl font-bold tracking-tight">
              Dog<span className="text-primary">Work</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#ai" className="hover:text-foreground transition-colors">IA</a>
            <a href="#features" className="hover:text-foreground transition-colors">{t("landing.navFeatures")}</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">{t("landing.navTestimonials")}</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">{t("landing.navPricing")}</a>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button onClick={() => navigate("/auth")} size="sm" className="rounded-full px-6">
              {t("landing.start")}
            </Button>
          </div>
        </div>
      </nav>

      {/* ========== HERO IA-FIRST ========== */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] -top-40 left-1/2 -translate-x-1/2" />
          <div className="absolute w-[400px] h-[400px] rounded-full bg-accent/8 blur-[100px] bottom-0 right-0" />
        </div>

        <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-16">
          <div className="flex-1 text-center md:text-left">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Coach canin propulsé par l'IA
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="visible"
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
              L'IA qui éduque
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                votre chien avec vous.
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} initial="hidden" animate="visible"
              className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto md:mx-0 mb-8 leading-relaxed">
              Chatbot intelligent 24/7, plans d'entraînement générés sur mesure, analyse comportementale automatique.
              DogWork transforme l'éducation canine grâce à l'intelligence artificielle.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible"
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button onClick={() => navigate("/auth")} size="lg"
                className="rounded-full px-8 text-base bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25">
                Essayer l'IA gratuitement
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button onClick={() => {
                document.getElementById("ai")?.scrollIntoView({ behavior: "smooth" });
              }} variant="outline" size="lg" className="rounded-full px-8 text-base border-border/60">
                Voir l'IA en action
              </Button>
            </motion.div>

            <motion.p variants={fadeUp} custom={4} initial="hidden" animate="visible"
              className="text-xs text-muted-foreground mt-4">
              10 crédits IA offerts à l'inscription · Aucune carte requise
            </motion.p>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 w-full max-w-md md:max-w-lg">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 rounded-[2rem] blur-2xl" />
              <img src={heroStaffie} alt="Staffie bleu"
                className="relative w-full rounded-3xl shadow-2xl shadow-primary/20 object-cover aspect-square" />
              <div className="absolute -bottom-4 -left-4 bg-card border border-border/60 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3 max-w-[260px]">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Plan IA généré</div>
                  <div className="text-xs text-muted-foreground">28 jours sur mesure pour votre chien</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== STATS BAR ========== */}
      <section className="py-12 border-y border-border/30 bg-card/30">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={i} className="text-center">
              <div className="text-3xl md:text-4xl font-black text-primary">{stat.num}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ========== AI CAPABILITIES (NOUVEAU — section dédiée IA) ========== */}
      <section id="ai" className="py-20 md:py-28 px-4 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-[500px] h-[500px] rounded-full bg-primary/5 blur-[140px] top-1/2 left-1/4 -translate-y-1/2" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Notre force : l'intelligence artificielle
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              4 IA au service de votre chien<span className="text-primary">.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              DogWork intègre une suite complète de fonctionnalités IA, accessibles via un système de crédits transparent.
              Pas de surcoût caché, vous payez uniquement ce que vous utilisez.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5 mb-12">
            {AI_CAPABILITIES.map((cap, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
                className="group p-6 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 border border-border/40 hover:border-primary/40 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                    <cap.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-lg font-bold">{cap.title}</h3>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {cap.cost}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">{cap.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={5}
            className="rounded-2xl bg-gradient-to-br from-primary/10 via-card/60 to-accent/10 border border-primary/20 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
              <Coins className="w-8 h-8" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold mb-2">Système de crédits IA transparent</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">10 crédits offerts</strong> à l'inscription.
                Les abonnements Pro et Expert incluent des crédits mensuels (5 et 15).
                Besoin de plus ? Achetez des packs ponctuels (80, 150 ou 500 crédits) sans engagement.
              </p>
            </div>
            <Button onClick={() => navigate("/auth")}
              className="rounded-full px-6 shrink-0 bg-gradient-to-r from-primary to-accent">
              Tester gratuitement
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ========== VIDEO PROMO ========== */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0} className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              {t("landing.discoverTitle").replace(".", "")}<span className="text-primary">.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("landing.discoverDesc")}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl shadow-primary/15 border border-border/40">
            <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 rounded-[1.5rem] md:rounded-[2rem] blur-xl -z-10" />
            <video
              className="hidden md:block w-full aspect-video"
              autoPlay muted loop playsInline preload="metadata"
              poster="/og-image.png"
            >
              <source src="/dogwork-promo.mp4" type="video/mp4" />
            </video>
            <video
              className="md:hidden w-full aspect-[9/16]"
              autoPlay muted loop playsInline preload="metadata"
              poster="/og-image.png"
            >
              <source src="/dogwork-promo-vertical.mp4" type="video/mp4" />
            </video>
          </motion.div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section id="features" className="py-20 md:py-28 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              {t("landing.featuresTitle").replace(".", "")}<span className="text-primary">.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("landing.featuresDesc")}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
                className="group p-6 rounded-2xl bg-card/60 border border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                <div className={`w-12 h-12 rounded-xl bg-card border border-border/60 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${feat.color}`}>
                  <feat.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TRAINING SECTION ========== */}
      <section className="py-20 px-4 bg-card/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0} className="flex-1">
            <img src={staffieTraining} alt="Staffie en entraînement"
              className="w-full rounded-3xl shadow-xl object-cover aspect-video" loading="lazy" />
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={1} className="flex-1">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
              {t("landing.trainingTitle")} <span className="text-primary">{t("landing.trainingTitleHighlight")}</span>.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              {t("landing.trainingDesc")}
            </p>
            <ul className="space-y-3">
              {[t("landing.trainingBullet1"), t("landing.trainingBullet2"), t("landing.trainingBullet3"), t("landing.trainingBullet4")].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section id="testimonials" className="py-20 md:py-28 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              {t("landing.testimonialsTitle").replace(".", "")}<span className="text-accent">.</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TESTIMONIALS.map((tl, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
                className="p-6 rounded-2xl bg-card/60 border border-border/40">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: tl.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-[hsl(40,95%,55%)] text-[hsl(40,95%,55%)]" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">
                  "{tl.text}"
                </p>
                <div>
                  <div className="font-semibold text-sm">{tl.name}</div>
                  <div className="text-xs text-muted-foreground">{tl.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FAMILY SECTION ========== */}
      <section className="py-20 px-4 bg-card/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row-reverse items-center gap-12">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0} className="flex-1">
            <img src={staffieFamily} alt="Famille avec staffie"
              className="w-full rounded-3xl shadow-xl object-cover aspect-video" loading="lazy" />
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={1} className="flex-1">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
              {t("landing.familyTitle")} <span className="text-accent">{t("landing.familyTitleHighlight")}</span>.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              {t("landing.familyDesc")}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Users, label: t("landing.roleOwners") },
                { icon: GraduationCap, label: t("landing.roleEducators") },
                { icon: Building2, label: t("landing.roleShelters") },
                { icon: PawPrint, label: t("landing.roleAdopters") },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/40">
                  <r.icon className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{r.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== PRICING (aligné sur src/lib/plans.ts) ========== */}
      <section id="pricing" className="py-20 md:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Transparence totale sur nos prix<span className="text-primary">.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Pas de surprise, pas de frais cachés. Choisissez le plan adapté à vos besoins.
            </p>
          </motion.div>

          {/* Owner tiers */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground bg-muted/50 rounded-full px-4 py-1.5">
              <PawPrint className="w-4 h-4" /> Propriétaires de chiens
            </span>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mb-14">
            {/* Freemium */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
              className="p-6 rounded-2xl bg-card/60 border border-border/40 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg p-2 bg-muted text-muted-foreground">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Freemium</h3>
                  <p className="text-xs text-muted-foreground">Gratuit, pour toujours</p>
                </div>
              </div>
              <div className="text-3xl font-black mb-1">0 CHF</div>
              <div className="text-sm text-muted-foreground mb-5">Aucun engagement</div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  "1 profil chien",
                  "15 exercices fondamentaux",
                  "Journal d'entraînement",
                  "Suivi de progression basique",
                  "Statistiques essentielles",
                  "10 crédits IA offerts à l'inscription",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[hsl(var(--success))]" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={() => navigate("/auth")} variant="outline" className="w-full rounded-full">
                Commencer gratuitement
              </Button>
            </motion.div>

            {/* Pro */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={1}
              className="p-6 rounded-2xl bg-card/60 border border-primary/30 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg p-2 bg-primary/20 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Pro</h3>
                  <p className="text-xs text-muted-foreground">L'essentiel pour éduquer sérieusement</p>
                </div>
              </div>
              <div className="text-3xl font-black mb-1">9.90 <span className="text-lg font-semibold text-muted-foreground">CHF/mois</span></div>
              <div className="text-sm text-muted-foreground mb-5">Annulable à tout moment</div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  "Tout le plan Freemium, plus :",
                  "Jusqu'à 3 profils chien",
                  "150 exercices (basiques + intermédiaires)",
                  "Évaluation comportementale complète",
                  "Objectifs & problèmes personnalisés",
                  "Statistiques avancées",
                  "Export PDF des plans",
                  "5 crédits IA inclus / mois",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={() => navigate("/auth")}
                className="w-full rounded-full">
                S'abonner – 9.90 CHF/mois
              </Button>
            </motion.div>

            {/* Expert */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={2}
              className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-accent/30 shadow-lg shadow-primary/10 flex flex-col">
              <div className="absolute top-4 right-4 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full">
                Accès complet
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg p-2 bg-accent/20 text-accent">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Expert</h3>
                  <p className="text-xs text-muted-foreground">Toute la puissance DogWork</p>
                </div>
              </div>
              <div className="text-3xl font-black mb-1">19.90 <span className="text-lg font-semibold text-muted-foreground">CHF/mois</span></div>
              <div className="text-sm text-muted-foreground mb-5">Annulable à tout moment</div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  "Tout le plan Pro, plus :",
                  "Chiens illimités",
                  "480+ exercices (toute la bibliothèque)",
                  "Plan éducatif IA personnalisé",
                  "Chatbot IA 24/7",
                  "Analyse comportementale avancée",
                  "15 crédits IA inclus / mois",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={() => navigate("/auth")}
                className="w-full rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90">
                S'abonner – 19.90 CHF/mois
              </Button>
            </motion.div>
          </div>

          {/* AI Credit Packs (NOUVEAU) */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/15 p-6 md:p-8 mb-14">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg p-2 bg-primary/20 text-primary">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Packs de crédits IA</h3>
                <p className="text-xs text-muted-foreground">À la carte, sans engagement, valables sans limite de temps</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-card/60 border border-border/40 text-center">
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Découverte</div>
                <div className="text-2xl font-black">80 crédits</div>
                <div className="text-sm text-primary font-semibold mt-1">4.90 CHF</div>
              </div>
              <div className="p-4 rounded-xl bg-card/80 border border-primary/30 text-center relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">Populaire</div>
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Standard</div>
                <div className="text-2xl font-black">150 crédits</div>
                <div className="text-sm text-primary font-semibold mt-1">6.90 CHF</div>
              </div>
              <div className="p-4 rounded-xl bg-card/60 border border-border/40 text-center">
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Premium</div>
                <div className="text-2xl font-black">500 crédits</div>
                <div className="text-sm text-primary font-semibold mt-1">19.90 CHF</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              1 crédit = 1 message chatbot · 8 crédits = 1 plan éducatif IA · 13 crédits = 1 analyse comportementale
            </p>
          </motion.div>

          {/* Professional tiers */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground bg-muted/50 rounded-full px-4 py-1.5">
              <GraduationCap className="w-4 h-4" /> Professionnels
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {/* Éducateur */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
              className="p-6 rounded-2xl bg-card/60 border border-border/40 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg p-2 bg-primary/20 text-primary">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Éducateur canin</h3>
                  <p className="text-xs text-muted-foreground">Pour les professionnels de l'éducation</p>
                </div>
              </div>
              <div className="text-3xl font-black mb-1">200 <span className="text-lg font-semibold text-muted-foreground">CHF/an</span></div>
              <div className="text-sm text-muted-foreground mb-1">Facturation annuelle</div>
              <div className="text-xs text-muted-foreground/70 mb-5 italic">Tarif réduit si rattaché à un refuge partenaire</div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  "Gestion complète de vos clients",
                  "Suivi de tous les chiens clients",
                  "Notes & plans d'entraînement par chien",
                  "Calendrier de rendez-vous intégré",
                  "Alertes professionnelles automatiques",
                  "Publication de cours & réservations",
                  "Paiements via Stripe Connect",
                  "Tableau de bord & statistiques coach",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-muted/40 rounded-xl p-3 mb-4 space-y-1.5">
                <p className="text-xs font-semibold text-foreground">Transparence sur les frais</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>15,8 %</strong> de commission sur chaque transaction cours payée par un propriétaire.
                  Ce taux unique couvre les frais bancaires Stripe <em>et</em> finance l'écosystème DogWork.
                </p>
              </div>
              <Button onClick={() => navigate("/auth")}
                className="w-full rounded-full">
                S'inscrire – 200 CHF/an
              </Button>
            </motion.div>

            {/* Refuge / Chenil */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={1}
              className="p-6 rounded-2xl bg-gradient-to-br from-rose-500/5 to-primary/5 border border-rose-500/20 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg p-2 bg-rose-500/20 text-rose-400">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Refuge & Chenil</h3>
                  <p className="text-xs text-muted-foreground">Pour les associations & structures d'accueil</p>
                </div>
              </div>
              <div className="text-3xl font-black mb-1">Sur mesure</div>
              <div className="text-sm text-muted-foreground mb-5">Prix annuel adapté à votre structure</div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  "Gestion complète des animaux",
                  "Fiches par animal & suivi santé",
                  "Gestion des espaces & enclos",
                  "Équipe d'employés avec rôles & accès",
                  "Journal d'activités & observations",
                  "Évaluations comportementales",
                  "Collaboration avec éducateurs externes",
                  "Messagerie intégrée",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground text-center mb-4 leading-relaxed">
                Notre mission est de soutenir les refuges et associations, pas de les facturer lourdement.
                Le prix est adapté à chaque structure. Contactez-nous pour en discuter.
              </p>
              <Button onClick={() => window.location.href = "mailto:contact@dogwork.ch?subject=Demande%20refuge%20/%20chenil"}
                variant="outline"
                className="w-full rounded-full border-rose-500/30 hover:bg-rose-500/10">
                <Mail className="w-4 h-4 mr-2" />
                Nous contacter
              </Button>
            </motion.div>
          </div>

          {/* Modules optionnels payants : retirés tant que les add-ons Stripe ne sont pas activés en Live.
              Source de vérité : table `modules` (tous monthly_price_chf=0, is_addon=false en production). */}
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[800px] h-[800px] rounded-full bg-primary/8 blur-[150px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp} custom={0}
          className="relative max-w-3xl mx-auto text-center">
          <img src={logoDogwork} alt="DogWork" className="w-16 h-16 rounded-2xl mx-auto mb-6" />
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
            Prêt à laisser l'IA
            <br />
            <span className="text-primary">éduquer votre chien ?</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
            Inscrivez-vous gratuitement, recevez 10 crédits IA offerts et testez notre coach intelligent dès maintenant.
          </p>
          <Button onClick={() => navigate("/auth")} size="lg"
            className="rounded-full px-10 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-xl shadow-primary/25">
            <MessageCircle className="w-5 h-5 mr-2" />
            Démarrer gratuitement
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-border/30 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={logoDogwork} alt="DogWork" className="w-7 h-7 rounded-lg" />
            <span className="font-bold">Dog<span className="text-primary">Work</span></span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <a href="/install" className="hover:text-foreground transition-colors font-medium">Installer l'app</a>
            <a href="/terms" className="hover:text-foreground transition-colors">Conditions</a>
            <a href="/privacy" className="hover:text-foreground transition-colors">Confidentialité</a>
            <a href="/legal" className="hover:text-foreground transition-colors">Mentions légales</a>
          </div>
          <div className="text-sm text-muted-foreground">
            {t("landing.footerCopyright", { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
    </div>
  );
}
