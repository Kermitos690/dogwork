

# Plan : Adoptants liés au refuge + Audit production complet

## Contexte

L'adoptant est un propriétaire classique (rôle `owner`) mais lié à un refuge après adoption. Aujourd'hui, ce lien n'existe pas en base : l'adoptant ne voit pas le refuge dans ses contacts, et le refuge ne voit pas ses adoptants. La messagerie ne montre que la recherche, sans liste de contacts préexistants.

---

## Lot 1 — Système adoptant-refuge

### 1.1 Nouvelle table `adopter_links`

```text
adopter_links
├── id (uuid, PK)
├── adopter_user_id (uuid, NOT NULL)  ← le owner
├── shelter_user_id (uuid, NOT NULL)  ← le refuge
├── animal_id (uuid, NOT NULL)        ← l'animal adopté
├── animal_name (text)                ← dénormalisé pour affichage
├── created_at (timestamptz)
```

**RLS** :
- Adoptant voit ses propres liens
- Shelter voit ses adoptants
- Admin voit tout
- Personne ne peut INSERT/DELETE sauf admin et shelter

### 1.2 Liaison automatique à l'adoption

Dans `ShelterAnimalDetail.tsx`, quand le statut passe à "adopté" :
1. On cherche un compte `profiles` dont le `display_name` ou un champ email correspond à `adopter_email`
2. Si trouvé, on insère un enregistrement `adopter_links`
3. Si pas trouvé, on stocke quand même l'info dans `adoption_updates` (déjà fait) — le lien sera créé quand l'adoptant s'inscrira

Alternative plus fiable : créer une edge function qui, à l'inscription d'un nouvel owner, vérifie si son email figure dans `shelter_animals.adopter_email` et crée automatiquement le lien.

### 1.3 Messagerie enrichie — Messages.tsx (owners)

Remplacer le simple champ de recherche par une section **"Vos contacts"** affichée en permanence :
- **Éducateur lié** : via `client_links` (déjà existant)
- **Refuge d'origine** : via `adopter_links` → affiche le nom du refuge
- **Admin** : toujours visible (support)

La recherche reste disponible en dessous pour trouver d'autres utilisateurs.

### 1.4 Messagerie enrichie — ShelterMessages.tsx

Ajouter une section **"Contacts"** visible sans recherche :
- **Admin** : bouton déjà existant → le transformer en carte contact permanente
- **Coaches liés** : via `shelter_coaches` → liste complète
- **Adoptants** : via `adopter_links` → liste des adoptants avec nom de l'animal

### 1.5 Tutoriel adoptant (Help.tsx)

Enrichir l'onglet "Adoptant" existant avec :
- Comment contacter le refuge d'origine
- Comment envoyer des nouvelles post-adoption
- Comment accéder au suivi via messagerie

---

## Lot 2 — Audit et finalisation production

### 2.1 Messagerie complète pour tous les rôles

Chaque rôle aura une section "Contacts" visible sans recherche :

| Rôle | Contacts visibles |
|------|------------------|
| Owner | Son éducateur, son refuge d'adoption, admin |
| Coach | Ses clients, ses refuges liés, admin |
| Shelter | Admin, coaches liés, adoptants |
| Employee | Limité à son espace (pas de messagerie directe) |
| Admin | Tous (via recherche) |

### 2.2 Stripe Connect dashboard admin

Finaliser l'edge function `connect-dashboard` (déjà en place) avec :
- Vue des comptes éducateurs + solde
- Création de login links
- Listing des transferts récents

### 2.3 Plan Expert IA

Améliorer la génération pour le tier Expert :
- Analyse plus fine du profil comportemental
- Intégration du modèle avancé (Gemini Pro)
- Sessions adaptatifs basées sur les données du journal

### 2.4 UI admin gestion de données

Ajouter au dashboard admin une section de recherche/suppression :
- Rechercher un utilisateur, chien, plan par nom/email
- Boutons supprimer avec confirmation
- Basé sur les RLS admin déjà en place

### 2.5 Test end-to-end tous les rôles

Parcourir chaque flux :
- Owner : onboarding → plan → training → journal → messages
- Adoptant : inscription → lien refuge → messages refuge
- Coach : dashboard → clients → notes → cours → Stripe Connect
- Shelter : animaux → adoption → adoptant lié → messages
- Admin : dashboard → création comptes → trésorerie → suppression

---

## Fichiers impactés

```text
Migration SQL                         — adopter_links + RLS
src/pages/ShelterAnimalDetail.tsx     — lien auto adoption
src/pages/Messages.tsx                — contacts permanents (coach, refuge, admin)
src/pages/ShelterMessages.tsx         — contacts permanents (admin, coaches, adoptants)
src/pages/Help.tsx                    — enrichir onglet adoptant
src/pages/AdminDashboard.tsx          — UI gestion données
supabase/functions/connect-dashboard  — finaliser Stripe Connect
src/lib/planGenerator.ts              — plan Expert IA
```

## Ordre d'exécution

1. Migration `adopter_links` + RLS
2. Liaison auto dans `ShelterAnimalDetail.tsx`
3. Enrichir `Messages.tsx` (contacts owner)
4. Enrichir `ShelterMessages.tsx` (contacts shelter)
5. Enrichir `Help.tsx` (adoptant)
6. Stripe Connect dashboard
7. Plan Expert IA
8. UI admin gestion données
9. Test complet

