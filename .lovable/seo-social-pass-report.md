# Passe SEO / Social preview avancée — DogWork

Date : 2026-05-17  
Périmètre : routes publiques uniquement. Aucun changement sur Auth, Supabase, RLS, Stripe, Edge Functions, dashboards, crédits IA, notifications.

## 1. Audit du routing public existant (src/App.tsx)

Routes publiques réellement déclarées avant la passe :
- `/landing`, `/contact`, `/install`, `/unsubscribe`, `/auth`, `/reset-password`
- `/terms`, `/privacy`, `/legal`, `/legal/charte-coach`
- `/pricing`, `/gate-k9x`, `/access-denied`
- `/annuaire/coachs`, `/annuaire/refuges`, `/c/:slug`, `/r/:slug`
- SEO long-tail : `/education-canine-lausanne`, `/education-canine-vaud`, `/application-education-canine`, `/application-suivi-chien`, `/suivi-comportement-chien`, `/refuges-animaux-vaud`, `/adoption-chien-suisse-romande`
- `/` est servi par `Dashboard` derrière `ProtectedRoutes` (rendu public côté HTML statique uniquement via le prerender).

Écart avec les chemins prioritaires demandés :
- `/educateurs-canins` → inexistant → ajouté en **alias additif** vers `/annuaire/coachs`.
- `/refuges` → inexistant → alias additif vers `/annuaire/refuges`.
- `/adoption` → inexistant → alias additif vers `/adoption-chien-suisse-romande`.
- `/legal/privacy` → inexistant → alias additif vers `/privacy`.
- `/legal/terms` → inexistant → alias additif vers `/terms`.

Les alias sont implémentés par `<Navigate replace />` côté React (additif, ne casse aucune route existante) et reçoivent leur propre fichier HTML statique en `noindex,follow` avec canonical pointant vers la route cible (évite tout duplicate content).

## 2. Configuration SEO centralisée

Création de `src/config/seo.ts` — **source de vérité unique** consommée par :
- `src/components/SEOHead.tsx` (Helmet, runtime client) ;
- `scripts/prerender-meta.ts` (HTML statique au build).

Champs définis par route : `title`, `description`, `canonicalUrl`, `ogTitle`, `ogDescription`, `ogImage`, `ogImageAlt`, `ogType`, `twitterCard`, `twitterTitle`, `twitterDescription`, `twitterImage`, `aliasOf`, `noindex`.

Constantes globales : `SITE_URL = https://www.dogwork-at-home.com`, `DEFAULT_OG_IMAGE = /og-image.png` (1200×630, PNG), `DEFAULT_OG_LOCALE = fr_CH`, `twitter:card = summary_large_image`.

Aucune URL Lovable (`*.lovable.app`, `id-preview--*`) n'est utilisée dans les métadonnées publiques.

## 3. Composant `<SEOHead>` réutilisable

`src/components/SEOHead.tsx` lit la config par `path` et injecte titre, description, canonical, OG, Twitter et `og:image:width/height/type/alt`. Supporte un `overrides` ponctuel (pour les pages dynamiques type fiche coach / refuge).

**Limite SPA documentée dans le code** : Helmet mute le `<head>` après hydratation. Les crawlers sociaux (Facebook, LinkedIn, Slack, WhatsApp, X) n'exécutent pas JS ; ils ne voient que le HTML servi par l'hébergeur. Googlebot exécute JS et bénéficie donc de `<SEOHead>`. Pour les aperçus sociaux fidèles, le pré-rendering reste indispensable.

## 4. Pré-rendering par route renforcé

`scripts/prerender-meta.ts` réécrit pour consommer `SEO_ROUTES` depuis la config centralisée. Améliorations :
- ajoute (et non plus seulement remplace) les tags absents : `og:image:width/height/type/alt`, `og:site_name`, `og:locale`, `twitter:image:alt` ;
- injecte un `<link rel="canonical">` par route ;
- pose `<meta name="robots" content="noindex,follow">` sur les alias pour éviter le duplicate content tout en propageant l'autorité ;
- couvre désormais **23 routes** (18 canoniques + 5 aliases).

Le script est appelé via `postbuild` (déjà câblé dans `package.json` depuis la passe précédente). À la racine, Vite recopie `public/` dans `dist/`, puis ce script génère `dist/<path>/index.html` pour chaque route.

## 5. Sitemap & robots

`public/sitemap.xml` (généré par `scripts/generate-sitemap.ts`) reste limité aux **chemins canoniques** — les 5 aliases sont volontairement exclus du sitemap et marqués `noindex` dans leur HTML statique. Aucun changement requis ici.

## 6. Limite restante (hébergement)

L'audit précédent a confirmé que Lovable Hosting sert `dist/index.html` racine pour tous les deep links et **n'utilise pas** les fichiers `dist/<route>/index.html` produits par le prerender. Conséquence : tant que cette limite n'est pas levée, les crawlers sociaux voient la même home pour toutes les routes — peu importe la qualité de la config SEO.

Options recommandées, par ordre de coût / risque croissant :
1. **Edge function proxy ciblée crawlers** (User-Agent `facebookexternalhit`, `LinkedInBot`, `Slackbot`, `Twitterbot`, `WhatsApp`) qui sert le bon `dist/<route>/index.html`. Faible risque, aucun impact UX, aucun changement RLS/Stripe/Supabase. **Recommandé.**
2. Service de prerender externe (Prerender.io, prerender-node) — payant, dépendance tierce.
3. Migration vers un hébergeur honorant la convention `dist/<route>/index.html` (Vercel, Netlify, Cloudflare Pages) — gros impact opérationnel.
4. SSR/SSG complet (Vite SSR, ou migration Next.js / Astro) — gros refactor, non recommandé court terme.

## 7. Fichiers modifiés / créés

Créés :
- `src/config/seo.ts`
- `src/components/SEOHead.tsx`
- `.lovable/seo-social-pass-report.md` (ce rapport)

Modifiés :
- `scripts/prerender-meta.ts` (consomme la config centralisée + tags étendus)
- `src/App.tsx` (5 routes alias additives `<Navigate replace />`)

Inchangés (conformes à la contrainte) :
- `src/components/SEO.tsx` (legacy, toujours utilisé par les pages SEO existantes — non supprimé)
- Sitemap, robots.txt, og-image.png, index.html
- Toutes les routes privées, guards, Auth, Supabase, Stripe, Edge Functions, RLS, crédits IA.

## 8. Prochaines étapes de test

1. **Build production**, puis vérifier en local :  
   `cat dist/pricing/index.html | grep -E 'og:|twitter:|canonical'`  
   pour les 8 routes prioritaires + les 5 aliases.
2. Une fois déployé, purger / re-scraper :
   - **Facebook Sharing Debugger** — https://developers.facebook.com/tools/debug/ — bouton "Scrape Again" sur chaque URL.
   - **LinkedIn Post Inspector** — https://www.linkedin.com/post-inspector/ — coller chaque URL.
   - **X Card Validator** — https://cards-dev.twitter.com/validator (ou tweet test).
   - **Slack / WhatsApp / Discord** : test en partage direct dans un canal privé.
3. Comparer les aperçus retournés à la config `src/config/seo.ts`. Si une route renvoie encore la home générique, c'est la limite hébergement (point 6) — pas la config.
4. Décision attendue : valider l'option 1 (edge function proxy crawlers) pour débloquer définitivement les aperçus sociaux par route.
