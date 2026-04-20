
Objectif: remettre DogWork sur le fonctionnement standard, fiable et compréhensible de Lovable Cloud.

Constat actuel après relecture du code:
- Les crédits IA côté admin sont revenus sur une logique cohérente par environnement dans `AdminAIEconomy`: Preview utilise Test, Published utilise Live.
- Mais le projet reste brouillé par des restes de l’ancienne tentative “cross-env”:
  - `admin-live-proxy` existe encore avec une config active,
  - des messages admin parlent encore de “sync production” alors qu’un publish ne copie jamais les données,
  - plusieurs consommateurs de `check-subscription` ne récupèrent pas correctement les erreurs d’authentification 401,
  - ce 401 peut casser des guards / états globaux et donner l’impression que “plus rien ne marche”.
- Donc le vrai problème n’est pas “Preview doit partager la même base que Published”, mais:
  1. supprimer l’ambiguïté,
  2. rétablir un seul comportement standard partout,
  3. rendre l’auth et les crédits robustes.

Plan d’implémentation

1. Réimposer la règle unique Preview / Published
- Remettre partout la règle officielle:
  - Preview = environnement Test
  - Published / domaine public = environnement Live
- Ne plus laisser aucune logique runtime faire croire qu’une action Preview agit sur Live.
- Conserver le principe normal de publish:
  - le code frontend est publié en Live quand vous cliquez sur Publish,
  - les fonctions backend / schéma se déploient sur Live au publish,
  - les données ne se copient jamais entre Test et Live.

2. Nettoyer l’héritage “cross-env”
- Retirer du parcours produit toute dépendance réelle ou perçue à `admin-live-proxy`.
- Soit le laisser totalement dormant et non utilisé, soit le retirer proprement de la doc/config si possible sans risque.
- Supprimer les messages et labels qui entretiennent la confusion sur une “production sync” de données.

3. Corriger définitivement `check-subscription`
- Durcir l’Edge Function `check-subscription` pour la validation de session.
- Uniformiser tous les appels frontend à cette fonction:
  - `useSubscription.tsx`
  - `useEducatorSubscription.tsx`
  - `ShelterGuard.tsx`
  - `ShelterSubscription.tsx`
- En cas de JWT expiré / session invalide:
  - nettoyer la session locale proprement,
  - retomber sur un état “non abonné” sans écran cassé,
  - éviter les boucles de polling ou les guards incohérents.

4. Stabiliser le flux crédits IA
- Garder une seule vérité:
  - solde affiché,
  - confirmation de débit,
  - consommation du chat,
  - historique ledger,
  - ajustement admin,
  doivent toujours pointer sur la base de l’environnement courant.
- Vérifier et harmoniser:
  - `useAICredits.tsx`
  - `useCreditConfirmation.tsx`
  - `AICredits.tsx`
  - `AIChatBot.tsx`
- Invalidation de cache systématique après:
  - ajustement admin,
  - appel IA,
  - achat / réconciliation.

5. Clarifier l’interface admin
- Remplacer les textes ambigus par des messages simples:
  - “Vous travaillez en Preview/Test”
  - “Vous êtes sur l’application publiée / Live”
- Corriger notamment `AdminDashboard.tsx` et `AdminAIEconomy.tsx` pour qu’aucun bouton ne suggère qu’un publish transfère les données.
- Garder un bandeau environnement visible sur les écrans sensibles.

6. Vérification complète avant retour
- Tester le comportement attendu, pas seulement le code:
  - Preview: connexion, crédits admin, badge de solde, chatbot IA, guards d’abonnement
  - Published: mêmes parcours sur Live
- Vérifier qu’un clic sur Publish publie bien le code en production, sans promettre un faux “sync de data”.
- Vérifier l’absence de 401 bloquants dans les flux d’abonnement et l’absence d’écart entre solde affiché et solde débité.

Résultat attendu
- Preview et Published refonctionnent exactement comme ils doivent fonctionner chez Lovable:
  - même code après publication,
  - bases séparées,
  - plus aucun mélange Test/Live,
  - crédits IA cohérents,
  - plus de faux positifs ni d’interface trompeuse.

Détails techniques
- Fichiers les plus concernés:
  - `src/hooks/useSubscription.tsx`
  - `src/hooks/useEducatorSubscription.tsx`
  - `src/components/ShelterGuard.tsx`
  - `src/pages/ShelterSubscription.tsx`
  - `src/hooks/useAICredits.tsx`
  - `src/components/AIChatBot.tsx`
  - `src/pages/AdminAIEconomy.tsx`
  - `src/pages/AdminDashboard.tsx`
  - `supabase/functions/check-subscription/index.ts`
  - éventuellement `supabase/functions/admin-live-proxy/index.ts` et `supabase/config.toml`
- Règle produit finale à figer:
  - Publish publie le code et le backend,
  - pas les données,
  - crédits et abonnements lisent/écrivent toujours dans la base de l’environnement courant seulement.
