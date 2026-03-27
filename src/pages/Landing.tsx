import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { 
  Brain, Calendar, ShieldCheck, Users, PawPrint, BarChart3, 
  Building2, GraduationCap, Star, ArrowRight, CheckCircle2
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
    { num: "200+", label: t("landing.statsExercises") },
    { num: "28", label: t("landing.statsDays") },
    { num: "4", label: t("landing.statsRoles") },
    { num: "100%", label: t("landing.statsFree") },
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

      {/* ========== HERO ========== */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] -top-40 left-1/2 -translate-x-1/2" />
          <div className="absolute w-[400px] h-[400px] rounded-full bg-accent/8 blur-[100px] bottom-0 right-0" />
        </div>

        <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-16">
          <div className="flex-1 text-center md:text-left">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <PawPrint className="w-4 h-4" />
              {t("landing.badge")}
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="visible"
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
              {t("landing.heroTitle1")}
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                {t("landing.heroTitle2")}
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} initial="hidden" animate="visible"
              className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto md:mx-0 mb-8 leading-relaxed">
              {t("landing.heroDesc")}
            </motion.p>

            <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible"
              className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button onClick={() => navigate("/auth")} size="lg"
                className="rounded-full px-8 text-base bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25">
                {t("landing.cta")}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }} variant="outline" size="lg" className="rounded-full px-8 text-base border-border/60">
                {t("landing.discover")}
              </Button>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 w-full max-w-md md:max-w-lg">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 rounded-[2rem] blur-2xl" />
              <img src={heroStaffie} alt="Staffie bleu"
                className="relative w-full rounded-3xl shadow-2xl shadow-primary/20 object-cover aspect-square" />
              <div className="absolute -bottom-4 -left-4 bg-card border border-border/60 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--success))]/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{t("landing.planGenerated")}</div>
                  <div className="text-xs text-muted-foreground">{t("landing.planDaysCustom")}</div>
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
            <video className="hidden md:block w-full aspect-video" autoPlay muted loop playsInline>
              <source src="/dogwork-promo.mp4" type="video/mp4" />
            </video>
            <video className="md:hidden w-full aspect-[9/16]" autoPlay muted loop playsInline>
              <source src="/dogwork-promo-vertical.mp4" type="video/mp4" />
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

      {/* ========== PRICING ========== */}
      <section id="pricing" className="py-20 md:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              {t("landing.pricingTitle").replace(".", "")}<span className="text-primary">.</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              {t("landing.pricingDesc")}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
              className="p-8 rounded-2xl bg-card/60 border border-border/40">
              <div className="text-sm text-muted-foreground font-medium mb-2">{t("landing.priceFree")}</div>
              <div className="text-4xl font-black mb-1">0 CHF</div>
              <div className="text-sm text-muted-foreground mb-6">{t("landing.priceForever")}</div>
              <ul className="space-y-3 mb-8">
                {[t("landing.priceFeat1"), t("landing.priceFeat2"), t("landing.priceFeat3"), t("landing.priceFeat4")].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button onClick={() => navigate("/auth")} variant="outline" className="w-full rounded-full">
                {t("landing.priceSignup")}
              </Button>
            </motion.div>

            {/* Pro */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={1}
              className="relative p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30 shadow-lg shadow-primary/10">
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                {t("landing.pricePopular")}
              </div>
              <div className="text-sm text-primary font-medium mb-2">{t("landing.priceExpert")}</div>
              <div className="text-4xl font-black mb-1">9.90 CHF</div>
              <div className="text-sm text-muted-foreground mb-6">{t("landing.pricePerMonth")}</div>
              <ul className="space-y-3 mb-8">
                {[t("landing.priceExpertFeat1"), t("landing.priceExpertFeat2"), t("landing.priceExpertFeat3"), t("landing.priceExpertFeat4"), t("landing.priceExpertFeat5"), t("landing.priceExpertFeat6")].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button onClick={() => navigate("/auth")}
                className="w-full rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90">
                {t("landing.priceTryNow")}
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
            {t("landing.ctaTitle1")}
            <br />
            <span className="text-primary">{t("landing.ctaTitle2")}</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
            {t("landing.ctaDesc")}
          </p>
          <Button onClick={() => navigate("/auth")} size="lg"
            className="rounded-full px-10 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-xl shadow-primary/25">
            {t("landing.ctaButton")}
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
            {t("landing.footerCopyright", { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
    </div>
  );
}
