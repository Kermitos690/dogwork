# Cloudflare Worker — social preview DogWork (rapport final)

Date : 2026-05-17
Périmètre : routage crawlers sociaux uniquement. Zéro impact UX, Auth, Supabase, RLS, Stripe, crédits IA, notifications, dashboards privés.

---

## 1. État actuel — vérifié

| Élément | Statut |
|---|---|
| `src/config/seo.ts` (23 routes, canonical `https://www.dogwork-at-home.com`) | ✅ en place |
| `src/components/SEOHead.tsx` (Helmet client) | ✅ en place |
| `scripts/prerender-meta.ts` (génère `dist/<route>/index.html` au build) | ✅ en place |
| Routes alias React (`/educateurs-canins`, `/refuges`, `/adoption`, `/legal/privacy`, `/legal/terms`) | ✅ en place |
| Edge Function Supabase `social-preview` | ✅ livrée (`supabase/functions/social-preview/index.ts`), `verify_jwt = false` |
| Limite Lovable Hosting (pas de routing par User-Agent) | ✅ identifiée — résolue par ce Worker |
| Cloudflare Worker | ⏳ **à coller** (code fourni §3) + **routes à créer** (§5) |

### URL exacte de l'edge function social-preview

```
https://dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/social-preview
```

Paramètre obligatoire : `?path=/pricing` (ou n'importe quelle route SEO).
Optionnel : `&force=1` pour forcer le rendu HTML même sans User-Agent crawler (utile en debug).

### Validation manuelle (à exécuter dans un terminal)

```bash
# Doit retourner du HTML avec <title>Tarifs DogWork…</title> et tous les og:*
curl -s -A "facebookexternalhit/1.1" \
  "https://dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/social-preview?path=/pricing" \
  | grep -E "og:|twitter:|canonical"
```

Si la commande ci-dessus renvoie les tags attendus, l'edge function est OK et le Worker pourra l'utiliser.

---

## 2. Architecture finale (schéma)

```text
                    ┌──────────────────────────────┐
visiteur humain ──▶ │ Cloudflare (Worker)          │ ──▶ Lovable Hosting (SPA React)
                    │                              │
crawler social ───▶ │ détecte UA, appelle Supabase │ ──▶ HTML pré-rendu OG/Twitter
                    └──────────────────────────────┘
                              ▲
                              │ DNS A/CNAME proxied (orange cloud)
                              │
                       www.dogwork-at-home.com
                       dogwork-at-home.com (→ 301 vers www)
```

---

## 3. Code Cloudflare Worker — prêt à coller

Le fichier est versionné dans le repo : **`cloudflare/worker-social-preview.js`**.

Variables modifiables en haut du fichier :
- `CANONICAL_HOST = "www.dogwork-at-home.com"`
- `ROOT_HOST = "dogwork-at-home.com"`
- `SOCIAL_PREVIEW_URL = "https://dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/social-preview"`
- `CRAWLER_USER_AGENTS = [...]`

Garanties :
- ✅ humains → SPA Lovable inchangée (`return fetch(request)`)
- ✅ root domain → 301 vers `www` (preserve path + query)
- ✅ assets (`/assets/*`, `.js`, `.css`, `.png`, `og-image.png`, `sw.js`, `manifest`, `sitemap.xml`, etc.) jamais envoyés au pré-rendu
- ✅ erreur upstream Supabase → fallback automatique vers la SPA (pas de page cassée)
- ✅ aucune URL Lovable exposée
- ✅ aucune boucle (le Worker ne fait jamais de fetch vers lui-même)
- ✅ POST/PUT/PATCH/DELETE laissés passer tels quels

---

## 4. Guide Cloudflare pas-à-pas (iPhone & ordinateur)

> Tout se fait dans le navigateur. Pas besoin de terminal pour cette partie.

### A. Le domaine est-il déjà dans Cloudflare ?

1. Va sur `https://dash.cloudflare.com` et connecte-toi.
2. Si tu vois `dogwork-at-home.com` dans la liste des sites → **passer au §C**.
3. Si tu ne le vois pas → **passer au §B**.

### B. Domaine PAS encore dans Cloudflare

#### B.1 Créer un compte (si besoin)
- `https://dash.cloudflare.com/sign-up` → email + mot de passe → confirme l'email.

#### B.2 Ajouter le domaine
1. Bouton **Add a site** → tape `dogwork-at-home.com` → **Continue**.
2. Choisis le plan **Free** ($0).
3. Cloudflare scanne automatiquement les DNS actuels chez IONOS. **Vérifier que tous les records ci-dessous sont bien repris** (voir §6 checklist DNS). Si l'un manque, l'ajouter manuellement.

#### B.3 Changer les nameservers chez IONOS
1. Cloudflare affiche 2 nameservers (ex: `xxx.ns.cloudflare.com` et `yyy.ns.cloudflare.com`).
2. Va sur `https://login.ionos.fr` → **Domaines & SSL** → clique sur `dogwork-at-home.com`.
3. Section **Nameservers** → **Modifier** → **Utiliser d'autres nameservers** → colle les 2 nameservers Cloudflare → **Enregistrer**.
4. Retour Cloudflare → **Done, check nameservers**.
5. ⏳ Propagation : 5 min à 24 h (souvent <2 h). Cloudflare envoie un email quand c'est actif.

⚠️ **Avant de switcher les nameservers**, vérifie que TOUS tes records email (MX, SPF, DKIM, DMARC) ont bien été recopiés dans Cloudflare (§6). Sinon : email cassé.

### C. Domaine DÉJÀ dans Cloudflare

1. Clique sur `dogwork-at-home.com` → onglet **DNS** → **Records**.
2. Vérifie que les records `@` (root) et `www` existent :
   - Type `A` ou `CNAME`, pointant vers Lovable (`185.158.133.1` ou équivalent).
   - **Proxy status = Proxied (nuage orange)** — c'est ça qui active le Worker.
3. Vérifie que les records **email** (MX, TXT pour SPF/DKIM/DMARC) sont en **DNS only (nuage gris)** — §6.

### D. Créer le Worker

1. Sidebar gauche Cloudflare → **Workers & Pages**.
2. **Create application** → onglet **Workers** → **Create Worker**.
3. Donne un nom : `dogwork-social-preview-router`.
4. **Deploy** (déploie le hello world par défaut).
5. **Edit code** → supprime tout le contenu de `worker.js`.
6. Ouvre le fichier `cloudflare/worker-social-preview.js` du repo DogWork, **copie tout son contenu**, colle-le dans l'éditeur Cloudflare.
7. **Save and deploy** (en haut à droite) → confirmer.

### E. Brancher le Worker sur le domaine (routes)

1. Reste sur le Worker → onglet **Settings** → **Triggers** → **Routes** → **Add route**.
2. Crée ces deux routes :
   - Route : `www.dogwork-at-home.com/*` → Zone : `dogwork-at-home.com`
   - Route : `dogwork-at-home.com/*` → Zone : `dogwork-at-home.com`
3. Sauvegarder.

### F. Vérifier que le Worker tourne

- Dans le Worker → onglet **Logs** → **Begin log stream**.
- Dans un autre onglet : `curl -A "facebookexternalhit/1.1" https://www.dogwork-at-home.com/pricing`.
- Tu dois voir une ligne s'ajouter dans le log stream. Si oui ✅, le Worker intercepte bien le trafic.

---

## 5. Routes Cloudflare à créer

| Pattern | Zone |
|---|---|
| `www.dogwork-at-home.com/*` | `dogwork-at-home.com` |
| `dogwork-at-home.com/*` | `dogwork-at-home.com` |

---

## 6. Checklist DNS anti-casse (CRITIQUE)

Avant et après la bascule Cloudflare, **vérifier dans Cloudflare → DNS → Records** que TOUS les records ci-dessous existent et ont le bon **Proxy status**.

### À garder en PROXIED (nuage orange) — c'est ce que le Worker intercepte
| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `@` | `185.158.133.1` (Lovable) | 🟠 Proxied |
| A | `www` | `185.158.133.1` (Lovable) | 🟠 Proxied |

### À garder absolument en DNS ONLY (nuage gris) — sinon emails cassés
| Type | Name | Value (exemple — vérifier l'existant IONOS) | Proxy |
|---|---|---|---|
| MX | `@` | `mx00.ionos.fr` priorité 10 | ⚪ DNS only |
| MX | `@` | `mx01.ionos.fr` priorité 10 | ⚪ DNS only |
| TXT | `@` | `v=spf1 include:_spf.perfora.net include:_spf.kundenserver.de include:_spf.resend.com -all` | ⚪ DNS only |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@dogwork-at-home.com` | ⚪ DNS only |
| CNAME | `*._domainkey` (DKIM IONOS) | valeur IONOS | ⚪ DNS only |
| CNAME / TXT | DKIM Resend (`resend._domainkey` ou équivalent) | valeur Resend | ⚪ DNS only |
| CNAME | `notify` (sous-domaine Resend) | valeur Resend | ⚪ DNS only |
| CNAME | `send.notify` ou MX Resend | valeur Resend | ⚪ DNS only |

⚠️ **Règle d'or** : un record MX ou TXT en proxied → email cassé immédiatement. **Tous les records email DOIVENT rester DNS only (nuage gris)**.

### Ce qu'il NE FAUT JAMAIS supprimer
- Tous les `MX`
- Tous les `TXT` (SPF, DMARC)
- Tous les `CNAME` ou `TXT` de type `*._domainkey` (DKIM)
- Le sous-domaine `notify.dogwork-at-home.com` (utilisé par Resend pour `noreply@notify.dogwork-at-home.com`)
- Tout record que tu ne reconnais pas → laisse-le.

### Pour ne pas casser `contact@dogwork-at-home.com`
- MX IONOS → DNS only → ✅
- TXT SPF incluant `include:_spf.perfora.net` ou `include:_spf.kundenserver.de` → DNS only → ✅
- DKIM IONOS (CNAME `*._domainkey`) → DNS only → ✅

### Pour ne pas casser Resend (`notify.dogwork-at-home.com`)
- Tous les records CNAME/TXT/MX pointant vers `*.resend.com` → DNS only → ✅
- SPF inclut `include:_spf.resend.com` → DNS only → ✅

---

## 7. Checklist tests sociaux (après déploiement Worker)

| Outil | URL | Action |
|---|---|---|
| Facebook Sharing Debugger | https://developers.facebook.com/tools/debug/ | Coller URL → **Scrape Again** |
| LinkedIn Post Inspector | https://www.linkedin.com/post-inspector/ | Coller URL → **Inspect** |
| X / Twitter Card Validator | https://cards-dev.twitter.com/validator | Coller URL (ou faire un tweet test sur un compte privé) |
| OpenGraph.xyz | https://www.opengraph.xyz/ | Coller URL → aperçus Facebook / LinkedIn / Twitter / WhatsApp |

### URLs à tester (toutes)
- `https://www.dogwork-at-home.com/`
- `https://www.dogwork-at-home.com/pricing`
- `https://www.dogwork-at-home.com/educateurs-canins`
- `https://www.dogwork-at-home.com/refuges`
- `https://www.dogwork-at-home.com/adoption`
- `https://www.dogwork-at-home.com/legal/privacy`
- `https://www.dogwork-at-home.com/legal/terms`

✅ Résultat attendu : titre + description + image OG **différents** par route, image 1200×630.

---

## 8. Commandes curl de validation

### Crawlers (doivent retourner le HTML pré-rendu — court, plein de `og:*`)
```bash
curl -s -A "facebookexternalhit/1.1" https://www.dogwork-at-home.com/refuges | grep -E "og:|twitter:|canonical"

curl -s -A "LinkedInBot/1.0" https://www.dogwork-at-home.com/educateurs-canins | grep -E "og:|twitter:|canonical"

curl -s -A "Twitterbot/1.0" https://www.dogwork-at-home.com/pricing | grep -E "og:|twitter:|canonical"

curl -s -A "WhatsApp/2.0" https://www.dogwork-at-home.com/adoption | grep -E "og:|twitter:|canonical"

curl -s -A "Slackbot 1.0" https://www.dogwork-at-home.com/legal/privacy | grep -E "og:|twitter:|canonical"
```

### Humain (doit retourner la SPA React — gros HTML avec `<div id="root">` et `<script type="module">`)
```bash
curl -s https://www.dogwork-at-home.com/refuges | head -20
```

### Redirection root → www
```bash
curl -sI https://dogwork-at-home.com/pricing
# Doit retourner : HTTP/2 301
# location: https://www.dogwork-at-home.com/pricing
```

### Vérifier le passage par le Worker
```bash
curl -sI -A "facebookexternalhit/1.1" https://www.dogwork-at-home.com/pricing | grep -i "x-dogwork-prerender"
# Doit retourner : x-dogwork-prerender: social-preview
```

---

## 9. Risques identifiés

| Risque | Probabilité | Mitigation intégrée |
|---|---|---|
| Worker casse la SPA pour un humain | Très faible | Fallback `return fetch(request)` sur toutes les branches non-crawler |
| Worker boucle sur lui-même | Nul | Le Worker ne fait jamais de fetch vers son propre hostname |
| Edge function Supabase down | Faible | `try/catch` → fallback SPA normale (l'humain ET le crawler reçoivent l'app) |
| Assets statiques mal servis | Faible | Filtre `isStaticAsset()` (extensions + chemins + préfixes) |
| Email cassé par récupération DNS Cloudflare | Moyen si on bâcle la §B.2 | Checklist DNS §6 + obligation DNS only sur MX/TXT/DKIM |
| Crawler non listé → reçoit la SPA générique | Faible (ceux qui comptent sont listés) | Ajouter le UA dans `CRAWLER_USER_AGENTS` + redeploy Worker |
| Désynchronisation entre `src/config/seo.ts` et la fonction Supabase | Moyen long terme | Documenté dans le rapport précédent — script de sync à prévoir |

---

## 10. Procédure de rollback (3 niveaux)

### Niveau 1 — Désactiver le routage (réversible en 10 secondes, recommandé pour tester)
1. Cloudflare → **Workers & Pages** → `dogwork-social-preview-router`.
2. Onglet **Settings** → **Triggers** → **Routes**.
3. Supprime les deux routes (`www.dogwork-at-home.com/*` et `dogwork-at-home.com/*`).
4. Le Worker existe toujours mais ne reçoit plus aucun trafic → comportement Lovable 100% normal immédiatement.

### Niveau 2 — Supprimer le Worker
1. Workers & Pages → `dogwork-social-preview-router` → **Manage** → **Delete**.
2. Confirmer.

### Niveau 3 — Sortir entièrement de Cloudflare (cas extrême)
1. IONOS → Domaines → `dogwork-at-home.com` → **Nameservers** → **Utiliser les nameservers IONOS par défaut** → Enregistrer.
2. ⏳ Propagation 1–24 h.
3. Dans Lovable Hosting, reconfigurer le custom domain si nécessaire (DNS A `185.158.133.1` chez IONOS).
4. ⚠️ Avant de faire ça, **noter tous les records DNS Cloudflare** (capture d'écran complète) pour pouvoir les recréer chez IONOS — surtout MX, SPF, DKIM, DMARC, Resend.

### Le domaine ne se perd jamais
Le domaine appartient au compte IONOS. Cloudflare n'est que le serveur DNS ; supprimer Cloudflare ne supprime pas le domaine. Les emails repartent dès que les records MX/SPF/DKIM/DMARC sont en place (chez IONOS ou Cloudflare).

---

## 11. Limites restantes

1. **Routes dynamiques** (`/c/:slug`, `/r/:slug` — fiches publiques coach/refuge) : l'edge function retombe sur le fallback home. Pour des aperçus sociaux par profil, prévoir une passe ultérieure qui ajoute la lecture DB côté Supabase.
2. **Duplication config** : si une route est ajoutée dans `src/config/seo.ts`, il faut aussi l'ajouter dans `supabase/functions/social-preview/index.ts` (mapping inline). Sinon → fallback home.
3. **Plan Free Cloudflare** : 100 000 requêtes Worker/jour gratuites. Largement suffisant au trafic actuel (26 visiteurs / 159 pageviews sur 7 jours). À surveiller si croissance forte.
4. **Cache crawler** : Facebook, LinkedIn, etc. mettent en cache 24 h à 7 jours. Après tout changement de titre/description, utiliser "Scrape Again" sur chaque plateforme.

---

## 12. Conclusion

**✅ Prêt côté code et infrastructure DogWork.**

- Edge function Supabase `social-preview` : déployée et vérifiable par curl (§1).
- Worker Cloudflare : code complet livré dans `cloudflare/worker-social-preview.js`, prêt à copier-coller.
- Documentation pas-à-pas (Cloudflare + DNS + tests + rollback) : ci-dessus.

**⏳ Action restante (humaine, non automatisable) :**
1. Suivre §4 (B ou C selon état actuel Cloudflare).
2. Coller le Worker (§4.D).
3. Créer les 2 routes (§4.E).
4. Vérifier les DNS email §6 (CRITIQUE).
5. Lancer les tests §7 et §8.

Une fois ces 5 étapes faites, les aperçus sociaux par route deviennent corrects sur Facebook, LinkedIn, X, Slack, Discord, WhatsApp, Telegram. Aucune autre action côté code DogWork n'est requise.
