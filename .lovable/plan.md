

# Plan : Système d'abonnement Stripe à 3 niveaux

## Modèle

| | **Starter** (Gratuit) | **Pro** (7.90 CHF/mois) | **Expert** (12.90 CHF/mois) |
|---|---|---|---|
| Programme 28 jours standard | ✅ | ✅ | ✅ |
| Contacter éducateurs / réserver cours IRL | ✅ | ✅ | ✅ |
| Plans personnalisés (IA auto-générés) | ❌ | ✅ | ✅ |
| Chatbot IA éducation canine | ❌ | ❌ | ✅ |

**Règle critique** : Tous les paiements éducateurs passent par l'app (commission 30%). Contournement = bannissement.

## Étapes d'implémentation

### 1. Activer Stripe
Utiliser l'outil Stripe de Lovable pour configurer la connexion et créer les 2 produits/prix :
- **Pro** : 7.90 CHF/mois (récurrent)
- **Expert** : 12.90 CHF/mois (récurrent)

### 2. Base de données
Créer une table `subscriptions` :
- `id`, `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `plan` (enum: starter/pro/expert), `status` (active/canceled/past_due), `current_period_end`, `created_at`, `updated_at`
- RLS : utilisateurs voient uniquement leur propre abonnement
- Admins peuvent tout voir

### 3. Edge Functions Stripe
- **`stripe-checkout`** : crée une session Checkout pour Pro ou Expert, redirige vers Stripe
- **`stripe-webhook`** : écoute `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` pour mettre à jour la table `subscriptions`
- **`stripe-portal`** : crée un lien vers le portail client Stripe (gestion/annulation)

### 4. Hook `useSubscription`
- Requête la table `subscriptions` pour l'utilisateur courant
- Expose : `plan` (starter/pro/expert), `isActive`, `canGeneratePlan`, `canUseChat`, `canBookCourses` (toujours true)
- Défaut = "starter" si aucun abonnement

### 5. Gating des fonctionnalités
- **`AIChatBot.tsx`** : si plan ≠ expert → afficher un paywall avec bouton "Passer à Expert"
- **`Plan.tsx`** : bouton "Générer un plan personnalisé" → si plan = starter → paywall "Passer à Pro"
- **Cours IRL** : accessible à tous les niveaux (pas de restriction)

### 6. Page Abonnement (`/subscription`)
- Affiche les 3 plans en colonnes avec features
- Boutons "S'abonner" redirigeant vers Stripe Checkout
- Bouton "Gérer mon abonnement" (portail Stripe) si déjà abonné
- Accessible depuis le profil

### 7. Sécurité côté serveur
- Edge function `chat` : vérifier que l'utilisateur a un abonnement Expert actif avant de répondre
- Edge function de génération de plan (si existante) : vérifier abonnement Pro ou Expert
- Les vérifications côté client sont doublées côté serveur

## Détails techniques
- Monnaie : CHF (code devise Stripe `chf`)
- Les webhooks Stripe mettent à jour la table `subscriptions` en temps réel
- Le hook `useSubscription` utilise React Query avec invalidation sur changement
- Config TOML : `verify_jwt = false` pour le webhook Stripe (signé par Stripe, pas par JWT)

