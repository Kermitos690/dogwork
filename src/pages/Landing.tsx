import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Brain, Calendar, ShieldCheck, Users, PawPrint, BarChart3, 
  Building2, GraduationCap, Star, ArrowRight, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

const FEATURES = [
  { icon: Brain, title: "Plans IA personnalisés", desc: "28 jours d'entraînement adaptés au profil unique de votre chien grâce à l'intelligence artificielle.", color: "text-primary" },
  { icon: BarChart3, title: "Suivi comportemental", desc: "Journal quotidien, évaluation, statistiques en temps réel pour mesurer chaque progrès.", color: "text-accent" },
  { icon: Building2, title: "Gestion de refuge", desc: "Animaux, employés, espaces, adoptions — une plateforme complète pour les refuges.", color: "text-[hsl(var(--success))]" },
  { icon: GraduationCap, title: "Espace éducateur", desc: "Clients, cours, calendrier, paiements — tout pour les professionnels de l'éducation canine.", color: "text-[hsl(40,95%,55%)]" },
  { icon: Calendar, title: "Calendrier intelligent", desc: "Planification automatique des séances, rappels et rendez-vous pour ne rien oublier.", color: "text-primary" },
  { icon: ShieldCheck, title: "Sécurité & précautions", desc: "Alertes de sécurité, contre-indications, protocoles adaptés aux chiens réactifs.", color: "text-destructive" },
];

const TESTIMONIALS = [
  { name: "Marie L.", role: "Propriétaire de Rex", text: "Mon staffie a progressé en 2 semaines ce qui prenait 2 mois avant. Le plan IA a tout changé !", rating: 5 },
  { name: "Thomas D.", role: "Éducateur canin", text: "DogWork me permet de gérer mes 30 clients sans effort. L'espace pro est incroyable.", rating: 5 },
  { name: "SPA Genève", role: "Refuge", text: "La gestion de nos 80 animaux est devenue fluide. Les évaluations comportementales sont un vrai plus.", rating: 5 },
];

const STATS = [
  { num: "200+", label: "Exercices disponibles" },
  { num: "28", label: "Jours de plan adaptatif" },
  { num: "4", label: "Rôles professionnels" },
  { num: "100%", label: "Gratuit pour commencer" },
];

export default function Landing() {
  const navigate = useNavigate();

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
            <a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Témoignages</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a>
          </div>
          <Button onClick={() => navigate("/auth")} size="sm" className="rounded-full px-6">
            Commencer
          </Button>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-4">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] -top-40 left-1/2 -translate-x-1/2" />
          <div className="absolute w-[400px] h-[400px] rounded-full bg-accent/8 blur-[100px] bottom-0 right-0" />
        </div>

        <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-16">
          {/* Text */}
          <div className="flex-1 text-center md:text-left">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <PawPrint className="w-4 h-4" />
              Éducation canine nouvelle génération
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="visible"
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
              Votre chien mérite
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                le meilleur plan.
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} initial="hidden" animate="visible"
              className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto md:mx-0 mb-8 leading-relaxed">
              Programmes personnalisés par IA, suivi comportemental en temps réel, 
              gestion de refuge — tout en une seule plateforme.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible"
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button onClick={() => navigate("/auth")} size="lg"
                className="rounded-full px-8 text-base bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25">
                Commencer gratuitement
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }} variant="outline" size="lg" className="rounded-full px-8 text-base border-border/60">
                Découvrir
              </Button>
            </motion.div>
          </div>

          {/* Hero Image - Staffie */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 w-full max-w-md md:max-w-lg">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 rounded-[2rem] blur-2xl" />
              <img src={heroStaffie} alt="Staffie bleu"
                className="relative w-full rounded-3xl shadow-2xl shadow-primary/20 object-cover aspect-square" />
              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-card border border-border/60 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--success))]/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Plan généré !</div>
                  <div className="text-xs text-muted-foreground">28 jours personnalisés</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== VIDEO PROMO ========== */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0} className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Découvrez DogWork<span className="text-primary">.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Du refuge à la famille — une plateforme pour chaque étape du parcours canin.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl shadow-primary/15 border border-border/40">
            <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 rounded-[1.5rem] md:rounded-[2rem] blur-xl -z-10" />
            <video
              className="w-full aspect-video"
              autoPlay
              muted
              loop
              playsInline
              poster="/dogwork-promo-poster.jpg"
            >
              <source src="/dogwork-promo.mp4" type="video/mp4" />
            </video>
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

      {/* ========== FEATURES ========== */}
      <section id="features" className="py-20 md:py-28 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Tout ce qu'il faut<span className="text-primary">.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Une plateforme complète pour les propriétaires, éducateurs canins et refuges.
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
              Des programmes qui <span className="text-primary">fonctionnent</span>.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Notre IA analyse le profil complet de votre chien — race, âge, comportement, 
              problèmes identifiés — pour créer un plan d'entraînement sur-mesure de 28 jours.
            </p>
            <ul className="space-y-3">
              {["Adapté à la race et au tempérament", "Exercices progressifs jour par jour", "Suivi des progrès en temps réel", "Ajustements automatiques selon les résultats"].map((item, i) => (
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
              Ils nous font confiance<span className="text-accent">.</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
                className="p-6 rounded-2xl bg-card/60 border border-border/40">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-[hsl(40,95%,55%)] text-[hsl(40,95%,55%)]" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">
                  "{t.text}"
                </p>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
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
              Pour chaque <span className="text-accent">compagnon</span>.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Que vous soyez particulier, éducateur professionnel ou gérant de refuge, 
              DogWork s'adapte à votre réalité et à celle de vos compagnons.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Users, label: "Propriétaires" },
                { icon: GraduationCap, label: "Éducateurs" },
                { icon: Building2, label: "Refuges" },
                { icon: PawPrint, label: "Adoptants" },
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

      {/* ========== PRICING ========== */}
      <section id="pricing" className="py-20 md:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Commencez gratuitement<span className="text-primary">.</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Pas de carte bancaire requise. Upgradez quand vous voulez.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
              className="p-8 rounded-2xl bg-card/60 border border-border/40">
              <div className="text-sm text-muted-foreground font-medium mb-2">Gratuit</div>
              <div className="text-4xl font-black mb-1">0 CHF</div>
              <div className="text-sm text-muted-foreground mb-6">Pour toujours</div>
              <ul className="space-y-3 mb-8">
                {["1 chien", "Plan de base 28 jours", "Bibliothèque d'exercices", "Journal & suivi"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button onClick={() => navigate("/auth")} variant="outline" className="w-full rounded-full">
                S'inscrire
              </Button>
            </motion.div>

            {/* Pro */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={1}
              className="relative p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30 shadow-lg shadow-primary/10">
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                Populaire
              </div>
              <div className="text-sm text-primary font-medium mb-2">Expert</div>
              <div className="text-4xl font-black mb-1">9.90 CHF</div>
              <div className="text-sm text-muted-foreground mb-6">/mois</div>
              <ul className="space-y-3 mb-8">
                {["Chiens illimités", "Plan IA Expert adaptatif", "200+ exercices premium", "Messagerie éducateur", "Statistiques avancées", "Priorité support"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button onClick={() => navigate("/auth")}
                className="w-full rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90">
                Essayer maintenant
              </Button>
            </motion.div>
          </div>
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
            Prêt à transformer
            <br />
            <span className="text-primary">la vie de votre chien ?</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
            Rejoignez DogWork et commencez votre programme personnalisé dès aujourd'hui.
          </p>
          <Button onClick={() => navigate("/auth")} size="lg"
            className="rounded-full px-10 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-xl shadow-primary/25">
            Commencer maintenant
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-border/30 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoDogwork} alt="DogWork" className="w-7 h-7 rounded-lg" />
            <span className="font-bold">Dog<span className="text-primary">Work</span></span>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DogWork. Éducation canine intelligente.
          </div>
        </div>
      </footer>
    </div>
  );
}
