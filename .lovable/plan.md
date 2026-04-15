

## Diagnostic d'infrastructure — Résultat factuel

### 1. Identification des environnements

| | **TEST (Preview/Dev)** | **LIVE (Production)** |
|---|---|---|
| **Project ref** | `dcwbqsfeouvghcnvhrpj` | `hdmmqwpypvhwohhhaqnf` |
| **URL backend** | `https://dcwbqsfeouvghcnvhrpj.supabase.co` | `https://hdmmqwpypvhwohhhaqnf.supabase.co` |
| **Tables métier** | 62 tables (confirmé par query) | 62 tables (confirmé par query) |
| **Données crédits** | 5 wallets, ledger actif | Séparé |
| **Domaine frontend** | `id-preview--8dfb0029-...lovable.app` | `dogwork-at-home.com` / `dogwork-at-home.lovable.app` |

### 2. Le backend TEST est bien `dcwbqsfeouvghcnvhrpj` — avec toutes les tables

J'ai vérifié directement via l'outil de requête Lovable Cloud (environnement `development`) : **62 tables métier existent** dans le schéma `public`, incluant `ai_credit_wallets`, `ai_credit_ledger`, `ai_credit_packs`, `exercises` (480), etc.

**Si le dashboard Supabase que vous avez ouvert montre un schéma vide, c'est que vous regardez un autre projet Supabase**, pas celui lié à Lovable Cloud. L'accès au vrai backend se fait exclusivement via **Lovable Cloud > Cloud View** dans l'éditeur Lovable, pas via un dashboard Supabase externe.

### 3. Le vrai problème : les crédits ne sont pas ajoutés après achat

Le code webhook (lignes 158-181 de `stripe-webhook/index.ts`) est **correct** — il appelle `credit_ai_wallet` RPC. Mais :

- **`billing_events` est vide** dans l'environnement TEST → aucun webhook Stripe n'a jamais atteint cette instance
- **Aucun log Edge Function** pour `stripe-webhook` dans l'environnement TEST
- **Aucune entrée `purchase`** dans `ai_credit_ledger`

**Cause racine** : Le webhook Stripe est configuré pour pointer vers l'instance **LIVE** (`hdmmqwpypvhwohhhaqnf`), pas vers l'instance TEST. Les appels `checkout.session.completed` de Stripe arrivent donc sur LIVE, pas sur TEST. Le checkout fonctionne (Stripe reçoit le paiement), mais le callback webhook n'atteint jamais le backend TEST.

### 4. Plan de correction

**Étape 1** — Vérifier la configuration webhook Stripe
- Le webhook Stripe doit pointer vers `https://dcwbqsfeouvghcnvhrpj.supabase.co/functions/v1/stripe-webhook` pour l'environnement TEST
- Et vers `https://hdmmqwpypvhwohhhaqnf.supabase.co/functions/v1/stripe-webhook` pour LIVE

**Étape 2** — Action immédiate dans Stripe Dashboard
- Aller dans Stripe Dashboard > Developers > Webhooks
- Vérifier l'endpoint URL configuré
- Si un seul endpoint existe (pointant vers LIVE), ajouter un second endpoint pour TEST, ou utiliser le Stripe CLI pour le test local

**Étape 3** — Vérifier que `STRIPE_WEBHOOK_SECRET` dans l'environnement TEST correspond au bon endpoint
- Si le webhook secret correspond à l'endpoint LIVE, les signatures seront rejetées même si on redirige vers TEST

**Étape 4** — Alternative sans modifier Stripe
- Créditer manuellement via RPC pour débloquer les tests immédiats pendant que la configuration webhook est corrigée

### 5. Comment accéder au vrai backend

Le vrai backend contenant les 62 tables métier est accessible **uniquement** via :
- **Lovable Cloud** dans l'éditeur (onglet Cloud > Database > Tables)
- **Lovable Cloud > Run SQL** pour les requêtes directes
- Les outils de requête que j'utilise ici (`supabase--read_query`)

Le dashboard Supabase externe (`supabase.com/dashboard`) ne montre que les projets Supabase liés à **votre compte Supabase personnel**, pas le projet Lovable Cloud qui est géré automatiquement.

