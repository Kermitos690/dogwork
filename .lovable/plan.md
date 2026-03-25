

# Plan : Messagerie temps réel, suivi post-adoption, nettoyage routes et Stripe refuge

## 1. Messagerie dans la nav refuge + temps réel

**Problème actuel** : La messagerie n'apparaît pas dans la barre de navigation en bas (ShelterNav). Elle n'est accessible que via Paramètres. De plus, ShelterMessages utilise un polling toutes les 5s au lieu du Realtime Supabase.

**Actions :**

- **ShelterNav** : Remplacer l'onglet "Espaces" par "Messages" (icône MessageSquare) avec badge de messages non-lus
- **ShelterMessages** : Ajouter un abonnement Supabase Realtime sur la table `messages` (comme dans `Messages.tsx` pour les utilisateurs normaux) au lieu du `refetchInterval: 5000`
- **Filtrage** : Restreindre les conversations visibles aux employés du refuge (via `shelter_employees`) et à l'admin uniquement — pas de messagerie avec des utilisateurs lambda
- **Migration SQL** : `ALTER PUBLICATION supabase_realtime ADD TABLE messages;` (si pas déjà fait)

## 2. Suivi post-adoption

**Problème** : Quand un animal passe au statut "adopté", il n'y a aucun mécanisme pour que l'adoptant envoie des nouvelles au refuge.

**Actions :**

- **Nouvelle table `adoption_updates`** :
  ```sql
  CREATE TABLE adoption_updates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id uuid NOT NULL,
    shelter_user_id uuid NOT NULL,
    adopter_user_id uuid,
    adopter_name text DEFAULT '',
    adopter_email text DEFAULT '',
    message text DEFAULT '',
    photo_url text,
    created_at timestamptz DEFAULT now()
  );
  ```
  Avec RLS : le refuge voit ses propres updates, l'adoptant peut en insérer

- **Enregistrer l'adoptant** : Quand le statut change vers "adopté" dans ShelterAnimalDetail, demander le nom/email de l'adoptant (champs dans le formulaire de changement de statut)

- **Inbox post-adoption** : Section sur le dashboard refuge montrant les dernières nouvelles reçues des adoptants, avec photo et message

## 3. Nettoyage des routes dupliquées

**Problème** : Les routes `/shelter/*` sont déclarées 2 fois dans App.tsx — une fois dans le bloc `isShelter` (lignes 92-109) et une fois dans le bloc principal (lignes 157-166) pour l'accès admin. Le bloc principal n'a PAS de ShelterGuard.

**Action** : Supprimer les routes shelter dupliquées du bloc principal (lignes 157-166) et les remplacer par des routes wrappées avec un guard admin/shelter combiné pour éviter l'accès non autorisé.

## 4. Stratégie Stripe pour les refuges

**Contexte** : Les refuges sont créés sur devis par l'admin. Il n'existe pas encore de produit Stripe pour les refuges. Les produits existants sont :
- Pro : 7.90 CHF/mois
- Expert : 12.90 CHF/mois  
- Éducateur : 200 CHF/an

**Actions :**

- **Créer un produit Stripe** "DogWork Refuge" avec un prix annuel (sur devis, mais un tarif de base à définir). Je proposerai un tarif de 500 CHF/an comme point de départ.
- **Intégrer check-subscription** dans le flux shelter pour vérifier l'abonnement actif
- **Page /shelter/subscription** : Interface simple pour voir le statut de l'abonnement et gérer via le portail Stripe

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/components/ShelterNav.tsx` | Ajouter onglet Messages avec badge |
| `src/pages/ShelterMessages.tsx` | Realtime + filtrage employés/admin |
| `src/pages/ShelterAnimalDetail.tsx` | Champs adoptant lors du changement "adopté" |
| `src/pages/ShelterDashboard.tsx` | Section nouvelles post-adoption |
| `src/App.tsx` | Nettoyer routes dupliquées, ajouter /shelter/subscription |
| **NOUVEAU** `src/pages/ShelterSubscription.tsx` | Page abonnement refuge |
| **MIGRATION** | Table `adoption_updates` + realtime publication |

## Section technique

```text
ShelterNav tabs (5):
  Dashboard | Animaux | Messages(badge) | Stats | Paramètres

Realtime flow:
  supabase.channel('shelter-messages')
    → postgres_changes INSERT on messages
    → invalidateQueries(['shelter-conversations'])

Adoption flow:
  Status → "adopté" → Modal demande nom/email adoptant
    → INSERT adoption_updates (shelter_user_id, animal_id, adopter_*)
    → Adoptant peut poster des nouvelles via lien/email
```

