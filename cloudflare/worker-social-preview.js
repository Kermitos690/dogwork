// =============================================================================
// DogWork — Cloudflare Worker "social-preview-router"
// -----------------------------------------------------------------------------
// Role :
//   - Humains  -> servent la SPA Lovable normalement (rien ne change).
//   - Crawlers sociaux (Facebook, LinkedIn, X, Slack, Discord, WhatsApp,
//     Telegram, etc.) -> reçoivent un HTML pré-rendu riche en OG/Twitter
//     servi par l'edge function Supabase "social-preview".
//   - Domaine racine dogwork-at-home.com -> 301 vers www.dogwork-at-home.com.
//
// Aucune dépendance, aucun secret. Compatible Free plan Cloudflare.
// =============================================================================

// ----------------------------- VARIABLES À ÉDITER ----------------------------
const CANONICAL_HOST = "www.dogwork-at-home.com";
const ROOT_HOST = "dogwork-at-home.com";
const SOCIAL_PREVIEW_URL =
  "https://dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/social-preview";

// User-agents traités comme crawlers sociaux (insensible à la casse).
const CRAWLER_USER_AGENTS = [
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
  // "googlebot", // Décommenter si tu veux aussi servir le HTML pré-rendu à Google.
  // "bingbot",
];

// Extensions et chemins JAMAIS envoyés au pré-rendu (assets, sw, manifest...).
const STATIC_EXT = /\.(?:js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|json|txt|xml|webmanifest|woff2?|ttf|otf|eot|mp3|mp4|webm|pdf)$/i;
const STATIC_PATHS = new Set([
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/og-image.png",
  "/manifest.webmanifest",
  "/manifest.json",
  "/sw.js",
  "/sw-push.js",
]);
const STATIC_PREFIXES = ["/assets/", "/static/", "/icons/", "/images/"];

// -----------------------------------------------------------------------------

function isCrawler(ua) {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return CRAWLER_USER_AGENTS.some((p) => lower.includes(p));
}

function isStaticAsset(pathname) {
  if (STATIC_PATHS.has(pathname)) return true;
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (STATIC_EXT.test(pathname)) return true;
  return false;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 1) Forcer le canonical : root -> www (301, conserve path + query).
    if (url.hostname === ROOT_HOST) {
      const target = new URL(url.toString());
      target.hostname = CANONICAL_HOST;
      return Response.redirect(target.toString(), 301);
    }

    // 2) Méthodes non-GET/HEAD : laisser passer telles quelles.
    if (request.method !== "GET" && request.method !== "HEAD") {
      return fetch(request);
    }

    // 3) Assets statiques : laisser passer (jamais de pré-rendu).
    if (isStaticAsset(url.pathname)) {
      return fetch(request);
    }

    // 4) Détection crawler.
    const ua = request.headers.get("user-agent") || "";
    if (!isCrawler(ua)) {
      // Humain -> SPA Lovable normale.
      return fetch(request);
    }

    // 5) Crawler -> on récupère le HTML pré-rendu Supabase.
    try {
      const proxied = new URL(SOCIAL_PREVIEW_URL);
      proxied.searchParams.set("path", url.pathname);
      // On conserve la query string utile (mais on évite de la mettre dans path).
      // Si tu veux passer la query au pré-rendu, dé-commenter :
      // for (const [k, v] of url.searchParams) proxied.searchParams.append(`q_${k}`, v);

      const upstream = await fetch(proxied.toString(), {
        method: "GET",
        headers: {
          "user-agent": ua,
          "accept": "text/html",
        },
        // 6 secondes de garde-fou implicite via Cloudflare ; on n'attend pas plus.
        cf: { cacheTtl: 300, cacheEverything: true },
      });

      if (!upstream.ok) {
        // Fallback : on sert la SPA normale plutôt que de casser le crawl.
        return fetch(request);
      }

      const body = await upstream.text();
      return new Response(body, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300, s-maxage=3600",
          "x-dogwork-prerender": "social-preview",
          "x-robots-tag": upstream.headers.get("x-robots-tag") || "index,follow",
        },
      });
    } catch (_err) {
      // En cas d'erreur réseau côté Supabase, on dégrade vers la SPA normale
      // pour ne JAMAIS bloquer un crawl ou un utilisateur.
      return fetch(request);
    }
  },
};
