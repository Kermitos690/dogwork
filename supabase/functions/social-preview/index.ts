// Edge Function "social-preview"
// ----------------------------------------------------------------------------
// Sert un HTML minimal, riche en metadonnees Open Graph / Twitter, pour les
// crawlers sociaux (Facebook, LinkedIn, Slack, Discord, WhatsApp, Telegram,
// Twitter/X, Facebot, optionnellement Googlebot).
//
// Usage :
//   GET /functions/v1/social-preview?path=/pricing
//   GET /functions/v1/social-preview?path=/annuaire/coachs
//
// Comportement :
//   - Si User-Agent est un crawler social connu (ou ?force=1) : renvoie le
//     HTML "crawler" pre-rendu pour la route demandee.
//   - Sinon : renvoie 302 vers https://www.dogwork-at-home.com<path>
//     -> les vrais utilisateurs ne voient jamais cette URL.
//
// Cette fonction est PUBLIQUE (pas de JWT). Elle ne lit ni n'ecrit aucune
// donnee Supabase. Elle ne touche ni Auth, ni Stripe, ni RLS, ni notifications.
//
// IMPORTANT : pour que les crawlers atteignent vraiment cette fonction sans
// changer la SPA, il faut un reverse proxy en amont (Cloudflare Worker /
// Netlify edge / nginx) qui detecte le User-Agent et reecrit la requete vers
// /functions/v1/social-preview?path=<URL d'origine>. Voir le rapport :
// .lovable/seo-social-edge-proxy-report.md
// ----------------------------------------------------------------------------

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// ----- Config inline (miroir minimal de src/config/seo.ts) ------------------
// Volontairement duplique : une edge function Deno ne peut pas importer le
// code TypeScript du bundle Vite. Si src/config/seo.ts evolue, mettre a jour
// SEO_ROUTES ci-dessous.
const SITE_URL = "https://www.dogwork-at-home.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_OG_IMAGE_WIDTH = 1200;
const DEFAULT_OG_IMAGE_HEIGHT = 630;
const DEFAULT_OG_IMAGE_TYPE = "image/png";
const DEFAULT_OG_IMAGE_ALT =
  "DogWork — Éducation canine intelligente pour propriétaires, coachs et refuges";
const SITE_NAME = "DogWork";
const DEFAULT_OG_LOCALE = "fr_CH";

type Route = {
  path: string;
  title: string;
  description: string;
  canonicalPath?: string; // si alias
  noindex?: boolean;
};

const SEO_ROUTES: Route[] = [
  { path: "/", title: "DogWork — Éducation canine intelligente, refuges & coachs", description: "DogWork : programmes d'éducation canine personnalisés, gestion de refuge et suivi comportemental. Devenez l'éducateur que votre chien mérite." },
  { path: "/landing", title: "DogWork — La plateforme premium pour propriétaires, coachs et refuges", description: "Plans IA personnalisés, suivi comportemental, annuaire de coachs certifiés et outils refuges. Découvrez DogWork." },
  { path: "/pricing", title: "Tarifs DogWork — Starter, Pro & Expert dès 0 CHF", description: "Choisissez l'abonnement DogWork adapté : Starter gratuit, Pro 7.90 CHF, Expert 12.90 CHF. Crédits IA, plans personnalisés, suivi avancé." },
  { path: "/contact", title: "Contact — DogWork", description: "Une question, un partenariat, un retour ? Contactez l'équipe DogWork. Réponse sous 48h ouvrées." },
  { path: "/install", title: "Installer DogWork sur votre téléphone", description: "Installez l'application DogWork sur iOS et Android pour un accès rapide à vos plans, exercices et suivis." },
  { path: "/annuaire/coachs", title: "Annuaire des éducateurs canins certifiés — Suisse romande | DogWork", description: "Trouvez un éducateur canin certifié près de chez vous : Lausanne, Vaud, Genève, Fribourg. Profils vérifiés, spécialités, tarifs transparents." },
  { path: "/annuaire/refuges", title: "Refuges & associations canines — Suisse romande | DogWork", description: "Découvrez les refuges et associations canines partenaires DogWork. Chiens à l'adoption, suivi comportemental et accompagnement post-adoption." },
  { path: "/legal", title: "Mentions légales — DogWork", description: "Mentions légales et informations éditeur de la plateforme DogWork." },
  { path: "/legal/charte-coach", title: "Charte des coachs DogWork", description: "Engagements éthiques, qualité et déontologie des éducateurs canins référencés sur DogWork." },
  { path: "/privacy", title: "Politique de confidentialité — DogWork", description: "Comment DogWork collecte, utilise et protège vos données personnelles. Conformité RGPD et LPD suisse." },
  { path: "/terms", title: "Conditions générales — DogWork", description: "Conditions générales d'utilisation et de vente de la plateforme DogWork." },
  { path: "/education-canine-lausanne", title: "Éducation canine à Lausanne — Coachs certifiés & app DogWork", description: "Éducation canine à Lausanne : trouvez un éducateur certifié et suivez la progression de votre chien avec l'application DogWork." },
  { path: "/education-canine-vaud", title: "Éducation canine dans le canton de Vaud | DogWork", description: "Coachs canins certifiés dans le canton de Vaud et plans d'éducation personnalisés. Trouvez votre éducateur sur DogWork." },
  { path: "/application-education-canine", title: "Application d'éducation canine — Plans IA personnalisés | DogWork", description: "L'application DogWork génère des plans d'éducation canine personnalisés grâce à l'IA. Exercices, suivi et progression mesurable." },
  { path: "/application-suivi-chien", title: "Application de suivi du chien — Comportement, santé, progression | DogWork", description: "Suivez le comportement, la progression et le bien-être de votre chien avec l'application DogWork. Journal, statistiques, alertes." },
  { path: "/suivi-comportement-chien", title: "Suivi du comportement du chien — Journal & analyse | DogWork", description: "Suivez le comportement de votre chien dans la durée avec DogWork : journal quotidien, signaux d'alerte, tendances et partage avec un éducateur certifié." },
  { path: "/refuges-animaux-vaud", title: "Refuges pour animaux dans le canton de Vaud | DogWork", description: "Refuges canins partenaires DogWork dans le canton de Vaud. Chiens à l'adoption, accompagnement et suivi post-adoption." },
  { path: "/adoption-chien-suisse-romande", title: "Adoption d'un chien en Suisse romande | DogWork", description: "Adoptez un chien en Suisse romande via les refuges DogWork. Profils détaillés, suivi comportemental et accompagnement post-adoption." },

  // Aliases — noindex, canonical pointe vers la cible
  { path: "/educateurs-canins", canonicalPath: "/annuaire/coachs", noindex: true, title: "Éducateurs canins certifiés — Suisse romande | DogWork", description: "Trouvez un éducateur canin certifié près de chez vous. Profils vérifiés, spécialités et tarifs transparents sur DogWork." },
  { path: "/refuges", canonicalPath: "/annuaire/refuges", noindex: true, title: "Refuges canins & associations — Suisse romande | DogWork", description: "Refuges et associations partenaires DogWork. Chiens à l'adoption, suivi comportemental et accompagnement." },
  { path: "/adoption", canonicalPath: "/adoption-chien-suisse-romande", noindex: true, title: "Adoption d'un chien — Refuges DogWork en Suisse romande", description: "Adoptez un chien via les refuges partenaires DogWork. Profils détaillés et accompagnement post-adoption." },
  { path: "/legal/privacy", canonicalPath: "/privacy", noindex: true, title: "Politique de confidentialité — DogWork", description: "Comment DogWork collecte, utilise et protège vos données personnelles. Conformité RGPD et LPD suisse." },
  { path: "/legal/terms", canonicalPath: "/terms", noindex: true, title: "Conditions générales — DogWork", description: "Conditions générales d'utilisation et de vente de la plateforme DogWork." },
];

const ROUTE_MAP = new Map(SEO_ROUTES.map((r) => [r.path, r]));

const FALLBACK: Route = {
  path: "/",
  title: "DogWork — Éducation canine intelligente, refuges & coachs",
  description:
    "DogWork : programmes d'éducation canine personnalisés, gestion de refuge et suivi comportemental.",
};

// ----- Detection crawler ----------------------------------------------------
const CRAWLER_UA_PATTERNS = [
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "slack-imgproxy",
  "discordbot",
  "whatsapp",
  "telegrambot",
  "skypeuripreview",
  "embedly",
  "pinterest",
  "redditbot",
  "applebot",
  "vkshare",
  "w3c_validator",
  "googlebot", // optionnel : Google execute JS, mais accepte le HTML pre-rendu
  "bingbot",
  "yandex",
  "duckduckbot",
];

function isCrawler(ua: string): boolean {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return CRAWLER_UA_PATTERNS.some((p) => lower.includes(p));
}

// ----- HTML escape ----------------------------------------------------------
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ----- Rendu HTML crawler ---------------------------------------------------
function renderCrawlerHtml(route: Route, requestedPath: string): string {
  const canonicalPath = route.canonicalPath ?? route.path;
  const canonicalUrl = `${SITE_URL}${canonicalPath === "/" ? "/" : canonicalPath}`;
  const ogUrl = `${SITE_URL}${requestedPath === "/" ? "/" : requestedPath}`;
  const title = esc(route.title);
  const description = esc(route.description);
  const image = DEFAULT_OG_IMAGE;
  const imageAlt = esc(DEFAULT_OG_IMAGE_ALT);
  const robots = route.noindex ? "noindex,follow" : "index,follow";

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${esc(canonicalUrl)}">

<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:locale" content="${DEFAULT_OG_LOCALE}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${esc(ogUrl)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:type" content="${DEFAULT_OG_IMAGE_TYPE}">
<meta property="og:image:width" content="${DEFAULT_OG_IMAGE_WIDTH}">
<meta property="og:image:height" content="${DEFAULT_OG_IMAGE_HEIGHT}">
<meta property="og:image:alt" content="${imageAlt}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${imageAlt}">
</head>
<body>
<h1>${title}</h1>
<p>${description}</p>
<p><a href="${esc(canonicalUrl)}">${esc(canonicalUrl)}</a></p>
</body>
</html>`;
}

// ----- Handler --------------------------------------------------------------
Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  let requestedPath = url.searchParams.get("path") ?? "/";
  if (!requestedPath.startsWith("/")) requestedPath = `/${requestedPath}`;
  // Nettoyage : pas de query/hash
  requestedPath = requestedPath.split("?")[0].split("#")[0];
  // Retrait trailing slash sauf racine
  if (requestedPath.length > 1 && requestedPath.endsWith("/")) {
    requestedPath = requestedPath.slice(0, -1);
  }

  const ua = req.headers.get("user-agent") ?? "";
  const force = url.searchParams.get("force") === "1";
  const route = ROUTE_MAP.get(requestedPath) ?? FALLBACK;

  // Utilisateur normal : on redirige vers la vraie SPA, on n'expose jamais
  // cette URL aux visiteurs.
  if (!isCrawler(ua) && !force) {
    return Response.redirect(`${SITE_URL}${requestedPath === "/" ? "/" : requestedPath}`, 302);
  }

  const html = renderCrawlerHtml(route, requestedPath);
  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "X-Robots-Tag": route.noindex ? "noindex,follow" : "index,follow",
    },
  });
});
