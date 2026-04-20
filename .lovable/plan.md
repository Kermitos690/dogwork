

# Pourquoi l'attribution gratuite ne débloque rien en production

## Le vrai problème (en clair)

L'attribution d'abonnement gratuit échoue en production à cause de **5 défauts cumulés** dans la chaîne de droits. C'est logique une fois identifié :

1. **Frontend ne reconnaît que 3 paliers** (`starter / pro / expert`). Quand tu attribues `educator` ou `shelter`, le mapping renvoie `starter` → tout reste verrouillé.
2. **Mismatch du quota chiens** : le trigger DB autorise 3 chiens en Pro, mais le plan officiel Pro = 1 chien. Cohérence cassée.
3. **Triggers backend bloquent les paliers `educator`/`shelter`** : la fonction `tier_meets_minimum` ne connaît que `starter / pro / expert`. Un utilisateur avec override `shelter` est traité comme `starter` → évaluation, problèmes, objectifs **rejetés**.
4. **`useFeatureGate` ne bypass que pour les rôles admin/educator**, jamais pour les overrides commerciaux Shelter.
5. **Cross-environnement** : tu attribues l'override depuis Preview (DB Test) mais l'utilisateur se connecte sur le site publié (DB Live). Les deux bases ne se parlent pas.

## Plan de réparation

### 1. Aligner le palier `educator`/`shelter` dans tout le système

**`supabase/migrations/<new>.sql`** — étendre le mapping de tiers :
- `tier_meets_minimum` : ajouter `educator=4`, `shelter=5` (>= expert).
- `enforce_dog_limit` : `educator`, `shelter`, `expert` → illimité ; `pro` → 1 (aligné avec PLANS) ; sinon 1.
- Vérifier que les triggers `enforce_evaluation_tier`, `enforce_objectives_tier`, `enforce_problems_tier` traitent `educator`/`shelter` comme >= pro (résolu via le `tier_meets_minimum` étendu).

### 2. Frontend — reconnaître les 5 paliers

**`src/hooks/useSubscription.tsx`** :
- Ajouter `educator` et `shelter` au type `TierKey`.
- Ajouter leurs `product_id` dans la résolution `getTierByProductId` (réutiliser les constantes `EDUCATOR_PRODUCT_ID`, `SHELTER_PRODUCT_ID` de `plans.ts`).
- Pour ces deux tiers, retourner les mêmes droits qu'`expert` (chiens illimités, toutes features).

**`src/hooks/useFeatureGate.tsx`** :
- Bypass total si `tier === "educator" || tier === "shelter" || tier === "expert"` pour toutes les features booléennes.
- `useDogsLimit` : illimité pour ces 3 paliers.

**`src/lib/plans.ts`** :
- Exposer une fonction `tierGrantsFullAccess(tier)` partagée pour éviter les divergences futures.

### 3. Forcer le rafraîchissement immédiat après attribution

**`src/pages/AdminSubscriptions.tsx`** :
- Après `handleGrant`, invalider `["subscription"]`, `["privileged-role"]`, `["is_admin"]` (au cas où l'admin se l'attribue à lui-même).
- Afficher un message clair : *"Demande à l'utilisateur de se déconnecter/reconnecter pour appliquer immédiatement, sinon prise en compte sous 5 minutes."*

### 4. Solution au problème cross-environnement (la cause #1 visible)

Aujourd'hui, attribuer en Preview = écrire sur la DB Test, alors que ton vrai utilisateur en production est sur la DB Live → l'override n'existe pas pour lui.

Deux solutions, à choisir :

- **A. (Recommandé)** Forcer l'attribution à passer par une edge function `admin-grant-subscription` qui détecte l'environnement courant. En Preview, utiliser le proxy `admin-live-proxy` (déjà existant mais dormant) avec `LIVE_SERVICE_ROLE_KEY` pour écrire **dans la DB Live** quoi qu'il arrive. Comme ça, peu importe d'où l'admin attribue, c'est toujours la prod qui est mise à jour.
- **B.** Bandeau d'avertissement permanent sur `/admin/subscriptions` indiquant l'environnement actif (comme déjà fait sur `/admin/ai-economy`), forçant l'admin à faire l'opération depuis l'app publiée.

→ Je propose **A** car tu travailles depuis Preview et tu veux que ça affecte la prod.

### 5. Vérifications post-déploiement

- Migration appliquée → `tier_meets_minimum('shelter','pro')` doit renvoyer `true`.
- Test : attribuer `expert` à un compte test → reload → page Évaluation accessible, "Programmes Pro" déverrouillés, badge "Plan actuel : Expert" sur `/subscription`.

## Détails techniques

```
Flux après fix :
[Admin clique "Attribuer Expert"]
        ↓
[Edge function admin-grant-subscription]
        ↓ (LIVE_SERVICE_ROLE_KEY si Preview)
[admin_subscriptions Live DB : INSERT tier=expert]
        ↓
[User refresh / 5min poll]
        ↓
[check-subscription voit override → product_id=expert]
        ↓
[useSubscription tier=expert → useFeatureGate.allowed=true]
        ↓
[Triggers DB : tier_meets_minimum(expert, pro)=true → INSERT autorisés]
```

Fichiers modifiés :
- `src/hooks/useSubscription.tsx`
- `src/hooks/useFeatureGate.tsx`
- `src/lib/plans.ts` (ajout helper)
- `src/pages/AdminSubscriptions.tsx` (invalidation + bandeau env)
- `supabase/functions/admin-grant-subscription/index.ts` (nouveau, route via Live)
- `supabase/migrations/<timestamp>_align_tier_enforcement.sql` (étendre `tier_meets_minimum` + `enforce_dog_limit`)

