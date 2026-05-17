# Edge proxy SEO/social — DogWork

Date : 2026-05-17
Périmètre : crawlers sociaux uniquement. Aucun impact UX, Auth, Supabase, RLS, Stripe, crédits IA, notifications.

## 1. Solution livrée

**Edge Function publique `social-preview`** (`supabase/functions/social-preview/index.ts`).

- Sans dépendance externe, sans accès DB, sans secret.
- `verify_jwt = false` (déclarée dans `supabase/config.toml`).
- Lit `?path=<route>` et le User-Agent.
- Si le User-Agent correspond à un crawler social connu (ou si `?force=1`) → renvoie un HTML minimal entièrement balisé OG/Twitter pour la route demandée.
- Sinon → 302 vers `https://www.dogwork-at-home.com<path>` (les utilisateurs réels ne tombent jamais sur cette URL).

URL publique :
```
https://dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/social-preview?path=/pricing
```

## 2. Crawlers détectés

User-Agent contient (insensible à la casse) un des motifs suivants :
`facebookexternalhit`, `facebot`, `twitterbot`, `linkedinbot`, `slackbot`, `slack-imgproxy`, `discordbot`, `whatsapp`, `telegrambot`, `skypeuripreview`, `embedly`, `pinterest`, `redditbot`, `applebot`, `vkshare`, `w3c_validator`, `googlebot`, `bingbot`, `yandex`, `duckduckbot`.

## 3. Métadonnées servies par route

Pour chaque route, le HTML contient : `<title>`, `meta description`, `meta robots` (`noindex,follow` pour les alias), `link canonical` (toujours vers le chemin canonique, jamais l'alias), `og:site_name`, `og:locale`, `og:type`, `og:title`, `og:description`, `og:url`, `og:image`, `og:image:secure_url`, `og:image:type`, `og:image:width=1200`, `og:image:height=630`, `og:image:alt`, `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt`.

Domaine unique : `https://www.dogwork-at-home.com`. Aucune URL `*.lovable.app` exposée.

## 4. Routes couvertes (23)

Miroir de `src/config/seo.ts` (la config TypeScript ne pouvant pas être importée depuis Deno, le mapping est dupliqué en haut du fichier de la fonction — à synchroniser si `seo.ts` évolue).

Canoniques (18) : `/`, `/landing`, `/pricing`, `/contact`, `/install`, `/annuaire/coachs`, `/annuaire/refuges`, `/legal`, `/legal/charte-coach`, `/privacy`, `/terms`, `/education-canine-lausanne`, `/education-canine-vaud`, `/application-education-canine`, `/application-suivi-chien`, `/suivi-comportement-chien`, `/refuges-animaux-vaud`, `/adoption-chien-suisse-romande`.

Aliases (5, `noindex,follow`, canonical vers la cible) : `/educateurs-canins`, `/refuges`, `/adoption`, `/legal/privacy`, `/legal/terms`.

Toute autre route → fallback home (titre + description génériques DogWork).

## 5. ⚠️ Limite hébergement — action manuelle requise

**Lovable Hosting ne permet pas d'intercepter une requête par User-Agent avant de servir `dist/index.html`.** Les crawlers qui visitent directement `https://www.dogwork-at-home.com/pricing` continueront donc à recevoir la home SPA générique tant qu'aucun reverse proxy n'est mis en place en amont.

L'edge function ci-dessus **est l'outil** ; il manque le **routage** des crawlers vers elle. Trois options par coût/risque croissant :

### Option A — Cloudflare Worker devant le domaine (recommandé)
Mettre `www.dogwork-at-home.com` derrière Cloudflare (DNS proxy activé), puis déployer ce Worker :

```js
const CRAWLERS = /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|pinterest|redditbot|applebot|embedly|skypeuripreview/i;
const PROXY = "https://dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/social-preview";

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const ua = req.headers.get("user-agent") || "";
    if (CRAWLERS.test(ua)) {
      return fetch(`${PROXY}?path=${encodeURIComponent(url.pathname)}`, { headers: { "user-agent": ua } });
    }
    return fetch(req); // utilisateurs normaux -> origine Lovable Hosting
  },
};
```
Coût : gratuit (plan free Cloudflare). Risque : faible. Réversible en 1 clic.

### Option B — Netlify / Vercel devant Lovable Hosting
Même principe (edge middleware), si déjà utilisés ailleurs.

### Option C — Migration d'hôte (Vercel/Netlify/Cloudflare Pages)
Servirait directement les fichiers `dist/<route>/index.html` produits par `scripts/prerender-meta.ts`. Plus gros impact opérationnel, à réserver si Cloudflare Worker n'est pas envisageable.

Tant qu'aucune des trois options n'est en place, l'edge function reste appelable **manuellement** (cf. §6) — utile pour valider les aperçus dans les debuggers sociaux en collant l'URL Supabase directement.

## 6. Procédure de test

### 6.1 curl en simulant un crawler
```bash
# Facebook
curl -A "facebookexternalhit/1.1" \
  "https://dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/social-preview?path=/pricing" | head -40

# LinkedIn
curl -A "LinkedInBot/1.0" \
  "https://dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/social-preview?path=/annuaire/coachs"

# Twitter / X
curl -A "Twitterbot/1.0" \
  "https://dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/social-preview?path=/adoption-chien-suisse-romande"

# Force (sans UA crawler) — utile en debug
curl "https://dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/social-preview?path=/install&force=1"
```
Vérifier la présence de `og:title`, `og:description`, `og:image`, `canonical`, `twitter:card`.

### 6.2 Debuggers officiels (une fois Option A en place)
- **Facebook Sharing Debugger** — https://developers.facebook.com/tools/debug/ → coller `https://www.dogwork-at-home.com/pricing` → "Scrape Again".
- **LinkedIn Post Inspector** — https://www.linkedin.com/post-inspector/ → coller chaque URL prioritaire.
- **X Card Validator** — https://cards-dev.twitter.com/validator (ou tweet test dans un compte privé).
- **Slack / WhatsApp / Discord** — partager le lien dans un canal de test ; comparer avec la config `src/config/seo.ts`.

### 6.3 Avant Option A : test direct
Pour valider l'aperçu *sans* attendre le Worker, coller directement l'URL Supabase (`.../social-preview?path=/pricing`) dans le Facebook Debugger ou LinkedIn Inspector. Le HTML retourné contient tous les tags attendus.

## 7. Fichiers livrés / modifiés

Créés :
- `supabase/functions/social-preview/index.ts` — edge function.
- `.lovable/seo-social-edge-proxy-report.md` — ce rapport.

Modifiés :
- `supabase/config.toml` — ajout `[functions.social-preview] verify_jwt = false`.

Inchangés (contrainte respectée) :
- Auth, dashboards privés, RLS, schéma Supabase, Stripe, crédits IA, notifications, edge functions métier.
- Routing React, `src/config/seo.ts`, `<SEOHead>`, `scripts/prerender-meta.ts`, sitemap, robots, `index.html`.

## 8. Limites restantes / risques

1. **Le routage crawler → edge function n'est pas effectif sans Option A/B/C.** Sans Worker en amont, les debuggers sociaux ne verront le bon HTML que si on leur fournit l'URL Supabase directement.
2. **Duplication de la config SEO** entre `src/config/seo.ts` (TS, bundle Vite) et `supabase/functions/social-preview/index.ts` (Deno). Si une route ajoutée dans `seo.ts` n'est pas reportée dans la fonction, elle tombera sur le fallback home. Mitigation possible plus tard : exposer la config via un fichier JSON statique servi par Vite et fetché par l'edge function.
3. **Cache crawler côté plateformes sociales** : penser à utiliser "Scrape Again" / "Inspect" après tout changement.
4. **Pas de support des routes dynamiques** (`/c/:slug`, `/r/:slug`). Ces fiches publiques continuent à dépendre de `<SEOHead>` côté React (Googlebot OK ; crawlers sociaux KO sans prerender SSR dédié). À traiter dans une passe ultérieure si besoin d'aperçus par profil coach/refuge.
