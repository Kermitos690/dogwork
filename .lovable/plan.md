
# Plan DogWork — Suivi stratégique

## Sprint 1 — Verrouillage métier ✅ VALIDÉ

### 1.1 Auto-création adopter_link ✅
- Trigger `trg_auto_adopter_link` sur `shelter_animals`
- Détecte passage en statut `adopté`, crée le lien automatiquement
- Anti-doublon via index unique `(adopter_user_id, animal_id)`
- Journalisation dans `shelter_activity_log`
- Cas couverts : nominal, email absent, email inconnu, anti-doublon, re-adoption

### 1.2 Handle new user (inscription adoptant différée) ✅
- `handle_new_user()` crée automatiquement les `adopter_links` pour les animaux déjà adoptés correspondant à l'email du nouvel inscrit

### 1.3 Messagerie enrichie Owner ✅
- Contacts permanents : admin, refuge lié, éducateur lié
- Pas de recherche manuelle requise

### 1.4 Messagerie enrichie Shelter ✅
- Contacts permanents : admin, coaches, adoptants liés
- Cloisonnement vérifié

### 1.5 RLS cross-rôles ✅
- Tables critiques cloisonnées : `adopter_links`, `adoption_checkins`, `adoption_plans`, `dogs`, `messages`, `shelter_animals`

### Réserve documentée V1
**Réaffectation adoptant après adoption** :
- Non automatisée en V1
- Traitement manuel par admin/refuge (supprimer ancien lien, recréer le bon)
- Amélioration potentielle en V2

---

## Sprint 2 — Montée en valeur (en cours)

### Priorité haute
1. **Tutoriel adoptant** — Guide post-adoption dans Help.tsx
2. **Stripe Connect dashboard admin** — Vue comptes éducateurs, soldes, transferts
3. **UI admin gestion des données** — Recherche/suppression utilisateurs, chiens, plans

### Priorité produit premium
4. **Plan Expert IA** — Analyse comportementale avancée, sessions adaptatives

---

## Fichiers de référence

```text
Migration SQL                         — adopter_links + RLS + triggers
src/pages/Messages.tsx                — contacts permanents owner
src/pages/ShelterMessages.tsx         — contacts permanents shelter
src/components/CreditUsageDashboard.tsx — suivi crédits IA
src/pages/Settings.tsx                — intégration dashboard crédits
src/pages/Help.tsx                    — tutoriel adoptant (Sprint 2)
src/pages/AdminDashboard.tsx          — UI gestion données (Sprint 2)
```
