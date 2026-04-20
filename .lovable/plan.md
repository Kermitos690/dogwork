
Objectif: corriger à la fois le bug visible dans ton screen et les vrais défauts du module Plans pour que le comportement soit cohérent en preview et en production.

1. Clarifier la cause du “bug en screen”
- Le screen montré n’indique pas un bug métier DogWork dans l’interface Plans, mais un échec interne du moteur de traitement du prompt.
- Cause probable: le message est extrêmement long, répété plusieurs fois, mélange plusieurs demandes à la fois, et contient même des balises/instructions système copiées dans le prompt. Ce type de prompt surcharge facilement l’orchestrateur et peut produire “An internal error occurred”.
- Le correctif produit n’est donc pas seulement “réparer le prompt”, mais rendre l’app plus robuste pour que les vraies règles Plans soient codées clairement et ne dépendent pas d’un prompt géant.

2. Corriger les causes réelles côté produit
Problèmes identifiés:
- Les templates ne sont pas synchronisés entre environnements: en preview il y a 65 templates, en production il y en a 0.
- Le catalogue actuel ne respecte pas ta règle métier: 15 freemium et 50 pro au lieu de 5 freemium et 30 pro.
- Le plan IA n’est pas “sur demande”:
  - l’onboarding génère automatiquement un plan,
  - `useHasFeature("ai_plan")` retourne toujours `true`,
  - le message UI parle de débloquer avec Pro alors que tu veux réserver le plan IA personnalisé au niveau Expert.
- Le générateur est figé à 28 jours: l’utilisateur ne choisit pas la durée.
- La page Plans ne traite pas complètement les paliers `educator` / `shelter` comme accès complet.
- L’attribution d’abonnement admin peut être correcte dans un environnement mais invisible dans l’autre, et le rafraîchissement n’est pas immédiat.

3. Refonte ciblée du flux Plans
A. Templates freemium / pro
- Réduire le catalogue à:
  - 5 templates freemium maximum
  - 30 templates pro
- Masquer/supprimer les autres templates existants pour éviter toute incohérence.
- Afficher les bons compteurs et bons libellés dans l’UI.

B. Plan IA personnalisé
- Ne plus générer automatiquement un plan pendant l’onboarding.
- Conserver l’onboarding pour créer le chien, son évaluation, ses problèmes et objectifs.
- Ajouter sur la page Plan un vrai bloc “Générer un plan IA personnalisé” déclenché uniquement par l’utilisateur.
- Ajouter un choix de durée avant génération: nombre de jours défini par l’utilisateur.
- Réserver ce générateur personnalisé au niveau Expert / accès complet.

C. Logique du générateur
- Faire évoluer `generatePersonalizedPlan()` pour accepter une durée variable au lieu de toujours produire 28 jours.
- Conserver la règle clé: le plan doit être construit à partir des exercices déjà présents en base, en parcourant le catalogue disponible, puis en les sélectionnant selon:
  - profil du chien
  - problèmes
  - objectifs
  - sécurité
  - âge / santé / réactivité
  - historique comportemental pour Expert
- Ne pas générer des exercices inventés: uniquement composer un plan intelligent avec les exercices existants.

4. Fichiers à modifier
- `src/pages/Plan.tsx`
  - corriger les checks de tiers
  - séparer clairement templates vs IA personnalisée
  - ajouter le sélecteur de durée
  - corriger les textes “Pro” / “Expert”
  - traiter `educator` et `shelter` comme full access
  - corriger le compteur affiché “50 programmes” vers “30”
- `src/pages/Onboarding.tsx`
  - supprimer la génération automatique du plan
  - rediriger vers la page Plan après création du profil
  - garder la donnée chien prête pour une génération sur demande
- `src/lib/planGenerator.ts`
  - supporter une durée paramétrable
  - appliquer la sélection uniquement depuis les exercices en base
  - étendre les améliorations Expert aux accès complets si nécessaire
- `src/hooks/useSubscription.tsx`
  - fiabiliser le rafraîchissement après attribution d’abonnement
  - garder une résolution cohérente des tiers spéciaux
- `src/hooks/useFeatureGate.tsx`
  - aligner la logique commerciale avec les vraies règles Plans
- `src/lib/plans.ts`
  - aligner les messages marketing et limites visibles avec la nouvelle offre
- `src/pages/AdminSubscriptions.tsx`
  - déclencher un refresh immédiat plus fiable après attribution/révocation

5. Données backend à corriger
- Mettre à jour les données `training_plans` de templates pour respecter exactement 5 free / 30 pro.
- Répliquer ces données dans l’environnement live, car actuellement la prod n’a aucun template.
- Vérifier les overrides `admin_subscriptions` dans l’environnement réellement utilisé.
- Si nécessaire, ajouter un petit mécanisme de synchronisation de templates depuis une source unique pour éviter que la prod retombe à 0 template après une nouvelle itération.

6. Mémoire projet à enregistrer
Une fois approuvé et implémenté, enregistrer comme règle projet:
- maximum 5 plans freemium
- 30 plans pro
- plan IA personnalisé uniquement sur demande explicite de l’utilisateur
- plan personnalisé construit uniquement à partir des exercices existants en base
- la durée du plan IA doit être choisie par l’utilisateur
- le plan Expert doit produire un plan réellement adapté au chien sélectionné

7. Validation finale
- Vérifier en preview et en production que:
  - les 5 templates freemium s’affichent
  - les 30 templates pro s’affichent
  - un compte Starter voit seulement les templates free
  - un compte Pro voit les templates pro
  - un compte Expert peut lancer la génération IA personnalisée
  - un compte `educator` / `shelter` bénéficie bien de l’accès complet
  - après attribution admin, le changement est visible immédiatement sans attendre 5 minutes
  - l’onboarding ne génère plus de plan automatiquement
  - le plan généré respecte la durée choisie et n’utilise que les exercices existants

Détails techniques
- Constats mesurés:
  - preview/test: 65 templates (`15 free`, `50 pro`)
  - production/live: `0 template`
  - cela explique directement “les plans freemium ne sont pas intégrés” selon l’environnement
- Bug logique actuel:
  - `useHasFeature("ai_plan")` retourne toujours `true`
  - le générateur retourne toujours `totalDays: 28`
  - `Plan.tsx` considère `isPro = tier === "pro" || tier === "expert"` et oublie `educator` / `shelter`
- Risque métier actuel:
  - les règles visibles dans l’UI, les données en base et la logique d’accès ne racontent pas la même chose

Résultat attendu après implémentation
- un système simple et cohérent:
  - Starter: 5 programmes de base
  - Pro: 30 programmes supplémentaires
  - Expert: génération IA personnalisée sur demande, basée sur le profil réel du chien et les exercices déjà intégrés
  - plus aucun décalage entre attribution d’abonnement, contenu visible et environnement utilisé
