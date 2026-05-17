# Chat IA — capture intelligente des événements vers la fiche du chien

## Objectif
Quand l'utilisateur mentionne dans le chat un événement, une observation ou un changement (ex. "Zina est restée calme face à un hérisson", "Rex tire moins en laisse", "nouveau traitement antalgique"), l'agent extrait l'information et propose **en un clic** de l'enregistrer dans la fiche officielle du chien actif.

## Approche
Pattern **"propose puis confirme"** (jamais d'écriture silencieuse) :
1. À chaque message utilisateur (si un chien actif existe), un appel IA secondaire en JSON structuré analyse le texte et détecte 0 à N "captures" potentielles.
2. Si au moins une capture est détectée, une carte premium s'affiche sous la réponse IA : titre, cible (fiche/champ), valeur extraite, boutons **Enregistrer dans la fiche** / **Ignorer**.
3. Au clic, écriture réelle via RLS standard du chien actif. Toast de confirmation, invalidation des caches React Query.

## Types de captures supportés (v1)
| Type | Action DB | Exemple |
|---|---|---|
| `behavior_log` | INSERT dans `behavior_logs` | "Zina calme face à un hérisson" → commentaire + tension/focus si déductibles |
| `health_note` | UPDATE `dogs.health_notes` (append daté) | "vu le véto, traitement Carprofen 7 jours" |
| `dog_field_update` | UPDATE champ unitaire whitelisté de `dogs` | poids, niveau d'activité, stérilisation, vit avec enfants… |
| `dog_problem` | UPSERT `dog_problems` | "réagit fort aux trottinettes" |
| `dog_objective` | INSERT `dog_objectives` | "j'aimerais qu'il se pose mieux le soir" |

Liste blanche stricte de champs `dogs` modifiables (jamais : `user_id`, `id`, rôles, etc.).

## Backend
**Nouvelle edge function `chat-capture-event`** (non-stream, JSON strict) :
- Auth user, `active_dog_id` requis, charge la fiche.
- Appel Gemini 2.5 Flash avec output JSON schémé (`captures: Array<{kind, target_field?, payload, confidence, summary}>`).
- Coût crédits : **0** (déjà payé par le chat principal — on factorise sous le même appel grâce à un flag `capture_only` qui bypasse le débit). Sinon coût 1 crédit max.
- Retourne uniquement les captures à confiance ≥ 0.7.

**Nouvelle edge function `apply-chat-capture`** :
- Auth user, valide `capture` payload contre une zod-like whitelist.
- Applique l'écriture avec RLS du user (pas service role) → garantit qu'on ne peut écrire que sur SES chiens.
- Pour `dog_field_update` : whitelist serveur des colonnes autorisées.
- Retourne `{ ok, applied: {table, id} }`.

## Frontend
- `AIChatBot.tsx` : après `onDone` du stream, lance `chat-capture-event` en arrière-plan (avec `active_dog_id`). N'attend pas pour afficher la réponse.
- Nouveau composant `ChatCaptureCard.tsx` rendu sous la dernière réponse assistant : carte sobre, icône 📝, titre "Mettre à jour la fiche de {dog.name} ?", résumé + bouton primaire **Enregistrer** + bouton ghost **Ignorer**.
- État local (Map `messageId → captures[]`), pas de persistance des suggestions.
- En cas de plusieurs captures : pile verticale, chacune indépendante.

## Système de prompt
Le prompt système chat principal mentionne désormais : *"Si l'utilisateur partage un fait nouveau sur le chien, accuse réception sans écrire dans la base — une carte 'Enregistrer dans la fiche' apparaîtra automatiquement sous ta réponse."*

## Hors-scope v1 (à itérer ensuite)
- Captures multi-chiens dans un même message (v1 : uniquement chien actif).
- Captures sur animaux de refuge (`shelter_animals`) — possible v1.5.
- Édition de la valeur extraite avant enregistrement (v1 : valider tel quel ou ignorer).
- Indicateur "appliqué le …" persistant côté message historique.

## Fichiers attendus
- Création : `supabase/functions/chat-capture-event/index.ts`
- Création : `supabase/functions/apply-chat-capture/index.ts`
- Création : `src/components/ChatCaptureCard.tsx`
- Création : `src/hooks/useChatCapture.ts`
- Modification : `src/components/AIChatBot.tsx` (déclenche capture + rend la carte)
- Modification : `supabase/functions/ai-with-credits/index.ts` (ajout d'une ligne dans le system prompt)

## Sécurité
- Aucune écriture directe par l'IA. Tout passe par confirmation explicite utilisateur.
- `apply-chat-capture` n'utilise PAS le service_role → RLS protège.
- Whitelist serveur des colonnes `dogs` modifiables.
- Logs d'audit : `metadata.source = 'ai_chat_capture'` sur chaque insert/update.
