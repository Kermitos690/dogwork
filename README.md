# DogWork

Plateforme digitale premium pour l'écosystème canin professionnel — propriétaires, éducateurs, refuges, chenils et administration.

## Stack technique

- **Frontend** : React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · Framer Motion
- **Backend** : Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Paiements** : Stripe (Billing + Connect)
- **Emails** : Resend
- **Internationalisation** : i18next (FR / EN)

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
# 1. Installer les dépendances
npm install

# 2. Copier le fichier d'environnement
cp .env.example .env
# Remplir les valeurs dans .env

# 3. Lancer le serveur de développement
npm run dev
```

## Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complète des variables nécessaires.

> **⚠️ Sécurité** : les secrets (clés Stripe, service role Supabase, clés Resend, etc.) ne sont **jamais** versionnés. Ils sont gérés via les secrets Supabase / Lovable Cloud pour les Edge Functions.

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

🟢 Pré-lancement — en préparation pour mise en production.

## Licence

Projet propriétaire — tous droits réservés. © DogWork@Home by Teba.
