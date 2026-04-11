
# Plan DogWork — Suivi stratégique

## Sprint 1 — Verrouillage métier ✅ VALIDÉ

### 1.1 Auto-création adopter_link ✅
- Trigger `trg_auto_adopter_link` sur `shelter_animals`
- Détecte passage en statut `adopté`, crée le lien automatiquement
- Anti-doublon via index unique `(adopter_user_id, animal_id)`
- Journalisation dans `shelter_activity_log`

### 1.2 Handle new user (inscription adoptant différée) ✅
- `handle_new_user()` crée automatiquement les `adopter_links`

### 1.3 Messagerie enrichie Owner ✅
### 1.4 Messagerie enrichie Shelter ✅
### 1.5 RLS cross-rôles ✅

### Réserve V1
**Réaffectation adoptant après adoption** : non automatisée, traitement manuel.

---

## Sprint 2 — Montée en valeur ✅ VALIDÉ

### 2.1 Tutoriel adoptant ✅
- Déjà implémenté dans Help.tsx (guide complet post-adoption)

### 2.2 Stripe Connect dashboard admin ✅
- Nouvel onglet "Connect" dans `/admin/stripe`
- Vue des comptes éducateurs Express (statut onboarding, soldes)
- Liens login/onboarding Stripe pour chaque éducateur
- Solde plateforme (disponible + en attente)
- Transferts récents avec statut

### 2.3 UI admin gestion des données ✅
- Déjà implémenté dans AdminDashboard (recherche, suppression, rôles)

### 2.4 Suivi crédits IA ✅
- Dashboard consommation mensuelle
- Estimateur de solde
- Grille tarifaire

### 2.5 Fix runtime error AIChatBot ✅
- Auth guard ajouté pour éviter useAuth hors AuthProvider

---

## Sprint 3 — À planifier

### Priorité produit
1. Plan Expert IA — Analyse comportementale avancée
2. Notifications email transactionnelles
3. Parcours onboarding éducateur guidé
4. Analytics admin avancés
