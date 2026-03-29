# DogWork

Plateforme digitale premium pour l'écosystème canin professionnel — propriétaires, éducateurs, refuges, chenils et administration.

🌐 **Production** : [www.dogwork-at-home.com](https://www.dogwork-at-home.com)

## Stack technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · Framer Motion |
| **Backend** | Lovable Cloud (PostgreSQL, Auth, Edge Functions, Storage) |
| **Paiements** | Stripe (Billing + Connect) |
| **Emails** | Resend |
| **i18n** | i18next (FR / EN) |

## Structure du projet

```
src/              → Application React (pages, composants, hooks)
supabase/
  functions/      → Edge Functions (Deno)
  migrations/     → Migrations SQL
remotion/         → Génération vidéo promotionnelle (projet séparé)
```

## Démarrage local

```bash
# 1. Installer les dépendances (npm recommandé)
npm install

# 2. Copier le fichier d'environnement
cp .env.example .env
# Remplir les valeurs dans .env

# 3. Lancer le serveur de développement
npm run dev
```

> **Gestionnaire de paquets** : `npm` est le gestionnaire recommandé. Les lockfiles `bun.lock` / `bun.lockb` sont générés par l'environnement Lovable et peuvent être ignorés.

## Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complète.

| Variable | Contexte | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Frontend | URL du projet backend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | Clé publique (anon) |
| `VITE_SUPABASE_PROJECT_ID` | Frontend | ID du projet |
| `VITE_ENVIRONMENT` | Frontend | `production` ou `development` |
| `STRIPE_SECRET_KEY` | Edge Functions | Clé API Stripe |
| `STRIPE_WEBHOOK_SECRET` | Edge Functions | Secret webhook Stripe |
| `RESEND_API_KEY` | Edge Functions | Clé API Resend |
| `ENVIRONMENT` | Edge Functions | `production` ou `development` |

> **⚠️ Sécurité** : les secrets (clés Stripe, service role, clés Resend, etc.) ne sont **jamais** versionnés. Ils sont gérés via les secrets Lovable Cloud pour les Edge Functions.

## Rôles utilisateur

| Rôle | Description |
|------|-------------|
| `owner` | Propriétaire de chien (rôle par défaut) |
| `educator` | Éducateur canin / coach |
| `shelter` | Gestionnaire de refuge / chenil |
| `shelter_employee` | Employé de refuge (accès PIN) |
| `admin` | Administrateur plateforme |

## Tests

```bash
npm run test
```

## Statut

🟢 **Production** — plateforme en ligne.

## Licence

Projet propriétaire — tous droits réservés. © DogWork@Home by Teba.
