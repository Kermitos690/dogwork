// Post-build prerender: writes per-route dist/<path>/index.html with
// route-specific <title>, meta description, canonical, og:* and twitter:*
// tags injected into the head, so non-JS crawlers (Facebook, LinkedIn,
// Slack, Twitter, Discord) see accurate previews without executing JS.
//
// The SPA still hydrates normally on the client (the bundle paths are
// absolute and unchanged). Helmet keeps overriding tags for JS crawlers.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, join } from "path";

const SITE = "https://www.dogwork-at-home.com";
const OG_IMAGE = `${SITE}/og-image.png`;
const DIST = resolve("dist");

interface RouteMeta {
  path: string;
  title: string;
  description: string;
  ogType?: "website" | "article" | "profile";
}

// Public, indexable routes only. Must stay aligned with sitemap + App.tsx.
const routes: RouteMeta[] = [
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
];

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function injectMeta(template: string, meta: RouteMeta): string {
  const url = `${SITE}${meta.path === "/" ? "/" : meta.path}`;
  const title = escapeHtml(meta.title);
  const desc = escapeHtml(meta.description);
  const ogType = meta.ogType ?? "website";

  let html = template;

  // Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);

  // Replace meta description
  html = html.replace(
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${desc}">`,
  );

  // Replace og:title / twitter:title
  html = html.replace(
    /<meta\s+property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${title}">`,
  );
  html = html.replace(
    /<meta\s+name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${title}">`,
  );

  // Replace og:description / twitter:description
  html = html.replace(
    /<meta\s+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${desc}">`,
  );
  html = html.replace(
    /<meta\s+name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${desc}">`,
  );

  // Replace og:url
  html = html.replace(
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${url}">`,
  );

  // Replace og:type
  html = html.replace(
    /<meta\s+property=["']og:type["'][^>]*>/i,
    `<meta property="og:type" content="${ogType}">`,
  );

  // Inject canonical (static index.html intentionally omits it for Helmet).
  // Insert just before </head> so it ships in the static HTML for non-JS crawlers.
  const canonical = `<link rel="canonical" href="${url}">`;
  html = html.replace(/<\/head>/i, `    ${canonical}\n  </head>`);

  return html;
}

function writeRouteHtml(meta: RouteMeta, template: string) {
  const html = injectMeta(template, meta);
  if (meta.path === "/") {
    writeFileSync(join(DIST, "index.html"), html);
    return;
  }
  const dir = join(DIST, meta.path.replace(/^\//, ""));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
}

function main() {
  const indexPath = join(DIST, "index.html");
  if (!existsSync(indexPath)) {
    console.warn(`[prerender-meta] dist/index.html not found — skipping.`);
    return;
  }
  const template = readFileSync(indexPath, "utf8");
  for (const route of routes) writeRouteHtml(route, template);
  console.log(`[prerender-meta] wrote ${routes.length} route HTML files in dist/`);
}

main();
