// Configuration SEO centralisée par route publique DogWork.
// Source de vérité unique pour :
//   - <SEOHead> (client, react-helmet-async)
//   - scripts/prerender-meta.ts (statique, build)
//   - scripts/generate-sitemap.ts (référence de cohérence)
//
// Règles :
//   - Domaine canonique unique : https://www.dogwork-at-home.com
//   - Jamais d'URL Lovable (id-preview, lovable.app) dans les métadonnées publiques.
//   - Travail additif : ne pas supprimer d'entrée, seulement enrichir.
//   - Routes privées / dashboards / auth : exclues volontairement.

export const SITE_URL = "https://www.dogwork-at-home.com";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;
export const DEFAULT_OG_IMAGE_TYPE = "image/png";
export const DEFAULT_TWITTER_CARD = "summary_large_image" as const;
export const DEFAULT_OG_LOCALE = "fr_CH";
export const SITE_NAME = "DogWork";

export type OgType = "website" | "article" | "profile" | "product";
export type TwitterCard = "summary" | "summary_large_image";

export interface SeoRouteConfig {
  /** Chemin canonique de la route, ex: "/pricing". */
  path: string;
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt?: string;
  ogType: OgType;
  twitterCard: TwitterCard;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  /** Optionnel : path canonique vers lequel cette route est un alias. */
  aliasOf?: string;
  /** Optionnel : ne pas indexer. */
  noindex?: boolean;
}

interface SeoSeed {
  path: string;
  title: string;
  description: string;
  ogType?: OgType;
  ogImage?: string;
  ogImageAlt?: string;
  aliasOf?: string;
  noindex?: boolean;
}

function buildRoute(seed: SeoSeed): SeoRouteConfig {
  const canonicalPath = seed.aliasOf ?? seed.path;
  const canonicalUrl = `${SITE_URL}${canonicalPath === "/" ? "/" : canonicalPath}`;
  const image = seed.ogImage ?? DEFAULT_OG_IMAGE;
  return {
    path: seed.path,
    title: seed.title,
    description: seed.description,
    canonicalUrl,
    ogTitle: seed.title,
    ogDescription: seed.description,
    ogImage: image,
    ogImageAlt:
      seed.ogImageAlt ??
      "DogWork — Éducation canine intelligente pour propriétaires, coachs et refuges",
    ogType: seed.ogType ?? "website",
    twitterCard: DEFAULT_TWITTER_CARD,
    twitterTitle: seed.title,
    twitterDescription: seed.description,
    twitterImage: image,
    aliasOf: seed.aliasOf,
    noindex: seed.noindex,
  };
}

// Routes prioritaires + couverture existante.
// Les chemins doivent correspondre exactement à ceux déclarés dans src/App.tsx
// (ou être enregistrés comme aliases / redirections additives).
const seeds: SeoSeed[] = [
  {
    path: "/",
    title: "DogWork — Éducation canine intelligente, refuges & coachs",
    description:
      "DogWork : programmes d'éducation canine personnalisés, gestion de refuge et suivi comportemental. Devenez l'éducateur que votre chien mérite.",
  },
  {
    path: "/landing",
    title: "DogWork — La plateforme premium pour propriétaires, coachs et refuges",
    description:
      "Plans IA personnalisés, suivi comportemental, annuaire de coachs certifiés et outils refuges. Découvrez DogWork.",
  },
  {
    path: "/pricing",
    title: "Tarifs DogWork — Starter, Pro & Expert dès 0 CHF",
    description:
      "Choisissez l'abonnement DogWork adapté : Starter gratuit, Pro 7.90 CHF, Expert 12.90 CHF. Crédits IA, plans personnalisés, suivi avancé.",
  },
  {
    path: "/contact",
    title: "Contact — DogWork",
    description:
      "Une question, un partenariat, un retour ? Contactez l'équipe DogWork. Réponse sous 48h ouvrées.",
  },
  {
    path: "/install",
    title: "Installer DogWork sur votre téléphone",
    description:
      "Installez l'application DogWork sur iOS et Android pour un accès rapide à vos plans, exercices et suivis.",
  },

  // Annuaires publics
  {
    path: "/annuaire/coachs",
    title: "Annuaire des éducateurs canins certifiés — Suisse romande | DogWork",
    description:
      "Trouvez un éducateur canin certifié près de chez vous : Lausanne, Vaud, Genève, Fribourg. Profils vérifiés, spécialités, tarifs transparents.",
  },
  {
    path: "/annuaire/refuges",
    title: "Refuges & associations canines — Suisse romande | DogWork",
    description:
      "Découvrez les refuges et associations canines partenaires DogWork. Chiens à l'adoption, suivi comportemental et accompagnement post-adoption.",
  },

  // Légal
  {
    path: "/legal",
    title: "Mentions légales — DogWork",
    description: "Mentions légales et informations éditeur de la plateforme DogWork.",
  },
  {
    path: "/legal/charte-coach",
    title: "Charte des coachs DogWork",
    description:
      "Engagements éthiques, qualité et déontologie des éducateurs canins référencés sur DogWork.",
  },
  {
    path: "/privacy",
    title: "Politique de confidentialité — DogWork",
    description:
      "Comment DogWork collecte, utilise et protège vos données personnelles. Conformité RGPD et LPD suisse.",
  },
  {
    path: "/terms",
    title: "Conditions générales — DogWork",
    description: "Conditions générales d'utilisation et de vente de la plateforme DogWork.",
  },

  // SEO long-tail Suisse romande
  {
    path: "/education-canine-lausanne",
    title: "Éducation canine à Lausanne — Coachs certifiés & app DogWork",
    description:
      "Éducation canine à Lausanne : trouvez un éducateur certifié et suivez la progression de votre chien avec l'application DogWork.",
  },
  {
    path: "/education-canine-vaud",
    title: "Éducation canine dans le canton de Vaud | DogWork",
    description:
      "Coachs canins certifiés dans le canton de Vaud et plans d'éducation personnalisés. Trouvez votre éducateur sur DogWork.",
  },
  {
    path: "/application-education-canine",
    title: "Application d'éducation canine — Plans IA personnalisés | DogWork",
    description:
      "L'application DogWork génère des plans d'éducation canine personnalisés grâce à l'IA. Exercices, suivi et progression mesurable.",
  },
  {
    path: "/application-suivi-chien",
    title: "Application de suivi du chien — Comportement, santé, progression | DogWork",
    description:
      "Suivez le comportement, la progression et le bien-être de votre chien avec l'application DogWork. Journal, statistiques, alertes.",
  },
  {
    path: "/suivi-comportement-chien",
    title: "Suivi du comportement du chien — Journal & analyse | DogWork",
    description:
      "Suivez le comportement de votre chien dans la durée avec DogWork : journal quotidien, signaux d'alerte, tendances et partage avec un éducateur certifié.",
  },
  {
    path: "/refuges-animaux-vaud",
    title: "Refuges pour animaux dans le canton de Vaud | DogWork",
    description:
      "Refuges canins partenaires DogWork dans le canton de Vaud. Chiens à l'adoption, accompagnement et suivi post-adoption.",
  },
  {
    path: "/adoption-chien-suisse-romande",
    title: "Adoption d'un chien en Suisse romande | DogWork",
    description:
      "Adoptez un chien en Suisse romande via les refuges DogWork. Profils détaillés, suivi comportemental et accompagnement post-adoption.",
  },

  // Aliases additifs (redirections côté React) — couvrent la liste prioritaire du brief
  // sans casser les routes canoniques existantes. Canonical pointe vers la cible.
  {
    path: "/educateurs-canins",
    aliasOf: "/annuaire/coachs",
    title: "Éducateurs canins certifiés — Suisse romande | DogWork",
    description:
      "Trouvez un éducateur canin certifié près de chez vous. Profils vérifiés, spécialités et tarifs transparents sur DogWork.",
  },
  {
    path: "/refuges",
    aliasOf: "/annuaire/refuges",
    title: "Refuges canins & associations — Suisse romande | DogWork",
    description:
      "Refuges et associations partenaires DogWork. Chiens à l'adoption, suivi comportemental et accompagnement.",
  },
  {
    path: "/adoption",
    aliasOf: "/adoption-chien-suisse-romande",
    title: "Adoption d'un chien — Refuges DogWork en Suisse romande",
    description:
      "Adoptez un chien via les refuges partenaires DogWork. Profils détaillés et accompagnement post-adoption.",
  },
  {
    path: "/legal/privacy",
    aliasOf: "/privacy",
    title: "Politique de confidentialité — DogWork",
    description:
      "Comment DogWork collecte, utilise et protège vos données personnelles. Conformité RGPD et LPD suisse.",
  },
  {
    path: "/legal/terms",
    aliasOf: "/terms",
    title: "Conditions générales — DogWork",
    description: "Conditions générales d'utilisation et de vente de la plateforme DogWork.",
  },
];

export const SEO_ROUTES: SeoRouteConfig[] = seeds.map(buildRoute);

export const SEO_ROUTE_MAP: Record<string, SeoRouteConfig> = Object.fromEntries(
  SEO_ROUTES.map((r) => [r.path, r]),
);

/** Retourne la config SEO pour un path donné, ou null si non publique. */
export function getSeoForPath(path: string): SeoRouteConfig | null {
  return SEO_ROUTE_MAP[path] ?? null;
}

/** Liste des chemins canoniques uniquement (sans alias) — utile pour sitemap. */
export const CANONICAL_PATHS: string[] = SEO_ROUTES.filter((r) => !r.aliasOf).map((r) => r.path);
