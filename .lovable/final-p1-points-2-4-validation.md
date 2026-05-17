# Validation P1 — Points 2 à 4 (Promenade, parse-epetcard, enrich-shelter-profile)

Date : 2026-05-17
Portée : audit ciblé des 3 points P1 issus de `.lovable/full-ecosystem-state-audit.md`.
Méthode : lecture exhaustive code + RLS + Edge Functions ; **aucune modification de code, aucune migration, aucun changement Stripe ni secret**.

---

## A. Résumé exécutif

**Verdict global : OK.**

Les 3 points ont été audités en profondeur. Le rapport global précédent les avait listés comme « à vérifier » ou « non branchés » — la vérification réelle montre qu'ils sont **tous déjà branchés, sécurisés et fonctionnels**. Aucun bouton mort détecté. Aucune correction additive nécessaire. Le rapport global sera mis à jour en conséquence.

| Point | Statut audité | Action requise |
|---|---|---|
| 2. Promenade e2e | **COMPLET** (RLS, fallback, météo non bloquante) | Aucune (tests GPS/mobile réels impossibles depuis Lovable) |
| 3. CTA `parse-epetcard` | **COMPLET** (branché dans `Onboarding`) | Aucune |
| 4. CTA `enrich-shelter-profile` | **COMPLET** (branché dans `ShelterProfile`) | Aucune |

---

## B. Statut du module Promenade

**Fichiers** : `src/pages/Promenade.tsx` (478 lignes), `src/components/WalkMap.tsx`, route `/promenade` (`AppLayout`, owner only). Edge function support : `get-walk-weather`.

### Parcours utilisateur audité
1. Sélection du chien actif (auto via `useActiveDog`, prérempli depuis `?dogId=` ou `/day/:dayId`).
2. Choix mode GPS / manuel via Switch.
3. Lancement → `navigator.geolocation.watchPosition` avec `enableHighAccuracy`, timeout 10s.
4. Capture continue des `GpsPoint` (lat/lng/t/accuracy).
5. Premier point déclenche `get-walk-weather` (Edge Function) → **non bloquant** (catch silencieux).
6. Carte rendue via `WalkMap` (encapsulé dans `MapBoundary` ErrorBoundary).
7. Événements rapides (8 boutons : pipi, caca, chien, humain, peur, calme, traction, bruit) → enrichissent `events[]`.
8. Stop → phase `summary` : pipi/caca, niveau jeu, zone émotionnelle après, notes.
9. Si mode manuel ou 0 points GPS : saisie durée + distance manuelle.
10. `save()` :
    - INSERT dans `dog_walks` avec `user_id`, `dog_id`, `day_id`, météo (nullable), durée, distance, état post-balade.
    - INSERT dans `dog_walk_points` (points GPS + événements) liés à `walk_id` et `user_id`.
11. Historique (10 dernières promenades) rechargé.

### RLS vérifiée

| Table | Policy | Effet |
|---|---|---|
| `dog_walks` | "Owners manage own walks" — ALL | utilisateur ne lit/écrit que ses propres promenades |
| `dog_walks` | "Admins read all walks" — SELECT | admin lecture seule |
| `dog_walk_points` | "Owners manage own walk points" — ALL | idem |
| `dog_walk_points` | "Admins read all walk points" — SELECT | admin lecture seule |

Aucune fuite possible entre utilisateurs. Aucune exposition publique.

### États gérés
- `gpsState` : `idle | watching | denied | unavailable`.
- GPS refusé → Alert destructive + instructions iPhone/Safari + fallback manuel proposé.
- GPS indisponible → Alert informative.
- Météo échoue → silencieux, balade continue.
- Aucun chien → bouton "Lancer" désactivé.
- Pas de points GPS → mode manuel automatique dans summary.

### Aucun mock détecté
Aucune donnée fictive, aucun `// TODO`, aucun placeholder. Toutes les écritures vont aux vraies tables avec `user_id` correct.

---

## C. Tests Promenade réalisés (depuis Lovable)

- ✅ Lecture statique : routes, hooks, RLS, RPC, edge function météo.
- ✅ Vérification policies RLS (`pg_policies`).
- ✅ Vérification schéma `dog_walks` / `dog_walk_points` (colonnes utilisées présentes).
- ✅ Vérification fallback météo non bloquant (`.catch(() => {})` ligne 126).
- ✅ Vérification ErrorBoundary autour de `WalkMap`.
- ✅ Vérification gating GPS (`navigator.geolocation`).

## D. Tests Promenade impossibles depuis Lovable

- ❌ Test réel GPS sur appareil mobile (iOS Safari + Android Chrome).
- ❌ Test réel installation PWA + autorisation géoloc système.
- ❌ Test réel `get-walk-weather` avec coordonnées valides (dépend du provider météo configuré côté Edge).
- ❌ Test e2e enregistrement complet avec déplacement physique.

**À tester manuellement** par l'utilisateur sur un téléphone réel avant ouverture publique du module.

## E. Corrections Promenade appliquées

**Aucune.** Le module est complet et sécurisé. Aucune intervention n'est sûre/nécessaire.

---

## F. Statut CTA `parse-epetcard`

**Localisation unique** : `src/pages/Onboarding.tsx` lignes 1025-1077.
**Visibilité** : owner (lors de la création du premier chien, si aucun `matchedAnimal` détecté).
**Edge Function** : `supabase/functions/parse-epetcard/index.ts` (175 lignes).

### Audit fonctionnel

| Critère | Statut |
|---|---|
| Bouton réellement cliquable | ✅ |
| Handler asynchrone branché | ✅ |
| Validation taille fichier (5 MB max) | ✅ |
| Format attendu : PDF uniquement (`accept=".pdf"`) | ✅ |
| Encodage base64 → POST `parse-epetcard` | ✅ |
| Auth JWT obligatoire côté Edge | ✅ (ligne 16-35) |
| Réponse parsée → préremplit `chip_id`, `name`, `breed`, `sex`, `birth_date`, `is_neutered` | ✅ |
| États loading / success / error via `toast()` | ✅ |
| Aucune écriture en BDD côté serveur (l'utilisateur valide ensuite le formulaire) | ✅ |
| Aucune donnée inventée (parse texte PDF brut, fallback silencieux si champ absent) | ✅ |

### Sécurité

- JWT vérifié via `supabase.auth.getUser()`.
- Pas d'écriture en base depuis l'Edge (extraction read-only).
- Pas d'exposition tier (l'utilisateur n'accède qu'à son propre upload).
- Format PDF strict + limite 5 MB côté client.

## G. Corrections / désactivation `parse-epetcard`

**Aucune.** Le CTA est fonctionnel et sécurisé.

---

## H. Statut CTA `enrich-shelter-profile`

**Localisation unique** : `src/pages/ShelterProfile.tsx` lignes 130-176 (handler), 220-231 (bouton "Enrichir avec l'IA"), 388-458 (dialog).
**Visibilité** : shelter (via `ShelterGuard` + `ShelterLayout`).
**Edge Function** : `supabase/functions/enrich-shelter-profile/index.ts` (281 lignes).

### Audit fonctionnel

| Critère | Statut |
|---|---|
| Bouton cliquable, ouvre dialog | ✅ |
| URL prérenseignée avec `form.website` | ✅ |
| Validation URL côté client (`/^https?:\/\//i`) | ✅ |
| Loading state (`enriching`, `Loader2`) | ✅ |
| Erreur affichée via toast | ✅ |
| Preview avant écriture (`preview` state + scroll) | ✅ |
| Application en **deux étapes** : aperçu → "Appliquer au formulaire" → utilisateur **doit cliquer Enregistrer** | ✅ |
| Aucun écrasement silencieux | ✅ |
| `mutation.mutate()` distincte du dialog (l'enregistrement final reste sous contrôle utilisateur) | ✅ |

### Sécurité Edge Function

| Critère | Statut |
|---|---|
| JWT obligatoire (`authHeader?.startsWith('Bearer ')`) | ✅ |
| Vérification rôle `shelter` ou `admin` via `user_roles` | ✅ (refuse owner/educator avec 403) |
| Protection SSRF complète | ✅ |
| └─ Schemas `http/https` uniquement | ✅ |
| └─ Refus credentials dans URL | ✅ |
| └─ Refus `localhost`, `*.localhost`, `metadata.google.internal` | ✅ |
| └─ Refus IPv4 privées : 10/8, 127/8, 169.254/16, 172.16-31/12, 192.168/16, 100.64-127/10, 224+ | ✅ |
| └─ Refus IPv6 loopback / ULA / link-local (`::1`, `::`, `fc*`, `fd*`, `fe80*`) | ✅ |
| └─ Résolution DNS + refus si résout vers IP privée | ✅ |
| └─ `redirect: "manual"` → refus redirections (anti-rebound SSRF) | ✅ |
| Mapping 402 (crédits IA) et 429 (rate limit) | ✅ |
| Aucune écriture en BDD côté serveur (extraction only) | ✅ |
| `additionalProperties: false` sur le tool schema | ✅ |
| Tool calling structuré + system prompt "n'invente jamais" | ✅ |

## I. Corrections / désactivation `enrich-shelter-profile`

**Aucune.** Le CTA est fonctionnel, sécurisé et respecte le principe d'aperçu + validation utilisateur.

---

## J. Fichiers modifiés

**Aucun fichier de code modifié.** Seul ce rapport est créé.

## K. Migrations créées

**Aucune.**

## L. Risques restants

| Risque | Niveau | Mitigation |
|---|---|---|
| Test GPS réel non effectué (Lovable n'a pas d'appareil mobile) | Moyen | À tester manuellement sur iPhone + Android avant ouverture publique |
| Météo dépend d'un provider tiers (configuré dans `get-walk-weather`) | Faible | Fallback silencieux déjà en place |
| Parsing PDF AMICUS basé sur regex texte → certains PDFs scannés (images) ne seront pas lus | Faible | Comportement attendu, toast affiche "puce non trouvée" |
| `enrich-shelter-profile` dépend de la structure HTML du site cible | Faible | Comportement attendu, IA peut omettre champs sans inventer |
| Aucun test e2e automatisé sur ces 3 flux | Faible | Couverture manuelle suffisante au stade actuel |

## M. Recommandations finales

1. **Mettre à jour** `.lovable/full-ecosystem-state-audit.md` : les CTA `parse-epetcard` et `enrich-shelter-profile` ne sont **pas** "non branchés", ils sont déjà connectés depuis longtemps. La mention "à brancher" était une erreur d'inventaire.
2. **Test mobile manuel** Promenade : 1 balade réelle iOS + 1 Android avec/sans GPS pour valider l'expérience.
3. **Optionnel** : ajouter un CTA `parse-epetcard` également sur `DogProfile` (édition rétroactive d'un chien existant) — pas bloquant, P3.

---

## N. Verdict final — Points 2 à 4

**OK** — Les 3 points sont complets, sécurisés, et ne nécessitent aucune correction. Seul un test mobile réel reste à effectuer pour valider Promenade en conditions réelles.
