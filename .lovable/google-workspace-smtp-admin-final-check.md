# Google Workspace SMTP — vérification ciblée `admin@dogwork-at-home.com`

Date : 2026-05-17
Fonction auditée : `supabase/functions/send-via-google/index.ts`
Adresse testée : `admin@dogwork-at-home.com`
Domaine racine : `dogwork-at-home.com`
**Pas d'audit `notify.dogwork-at-home.com` (hors scope).**

---

## 1. Secrets SMTP Google (présence uniquement, valeurs jamais affichées)

| Secret attendu | Présent ? | Source |
|---|---|---|
| `GOOGLE_SMTP_HOST` | ❌ Absent (non requis) | Hardcodé dans la fonction : `smtp.gmail.com` |
| `GOOGLE_SMTP_PORT` | ❌ Absent (non requis) | Hardcodé dans la fonction : `587` |
| `GOOGLE_SMTP_USER` | ✅ Présent | Vault |
| `GOOGLE_SMTP_PASSWORD` | ✅ Présent | Vault |
| `GOOGLE_SMTP_FROM` | ✅ Présent | Vault |

→ Tous les secrets nécessaires sont bien provisionnés. Aucun n'a été affiché.

---

## 2. Valeurs attendues (paramétrage cible)

| Paramètre | Attendu | Statut |
|---|---|---|
| Host | `smtp.gmail.com` | ✅ codé en dur |
| Port | `587` | ✅ codé en dur |
| Sécurité | STARTTLS (`tls: false` côté denomailer = upgrade STARTTLS) | ✅ codé en dur |
| User / From | `admin@dogwork-at-home.com` | ⚠️ **À vérifier manuellement côté Vault** (valeur du secret jamais affichable). Le code utilise `GOOGLE_SMTP_FROM || GOOGLE_SMTP_USER` — pas de From forcé. |
| Password | **Mot de passe d'application Google (16 caractères, pas le mot de passe du compte)** | ⚠️ **À vérifier manuellement côté Google Admin** |

→ La fonction ne force aucun autre domaine ni autre adresse `From`. Elle utilise exclusivement `GOOGLE_SMTP_FROM` puis fallback `GOOGLE_SMTP_USER`.

---

## 3. Logs Edge Function `send-via-google` (production)

Erreur réelle, répétée à chaque appel (3 occurrences entre 14:07 et 14:10) :

```
ERROR event loop error: Error: invalid cmd
    at SMTPConnection.assertCode (denomailer@1.6.0/client/basic/connection.ts:57:13)
    at SMTPConnection.writeCmdAndAssert (denomailer@1.6.0/client/basic/connection.ts:100:10)
```

**Aucune ligne `email_send_log status=failed` n'est écrite** car l'erreur survient hors du `try/catch` (event loop error de la lib SMTP) → l'utilisateur reçoit le message générique `"Edge Function returned a non-2xx status code"` sans détail.

### Interprétation de `invalid cmd`

`assertCode` est appelée après chaque commande SMTP (EHLO, STARTTLS, AUTH LOGIN, MAIL FROM, RCPT TO, DATA). Le serveur Gmail a renvoyé un code de réponse différent de celui attendu par denomailer.

Sur `smtp.gmail.com:587` avec denomailer 1.6.0, **les deux causes de loin les plus probables** sont :

1. **Mot de passe d'application Google invalide ou absent** → Gmail répond `535-5.7.8 Username and Password not accepted` à la commande `AUTH LOGIN`. denomailer 1.6.0 ne mappe pas ce code et le remonte en `invalid cmd`.
2. **Mot de passe du compte normal utilisé au lieu d'un App Password** → même réponse `535`. Google n'accepte plus l'authentification simple depuis mai 2022.

Cause moins probable mais possible :
3. Bug connu denomailer 1.6.0 sur l'upgrade STARTTLS de Gmail (rare, mais documenté).

---

## 4. La fonction force-t-elle un autre `From` / domaine ?

**Non.** Vérifié dans `supabase/functions/send-via-google/index.ts` :

```ts
const FROM_ADDRESS = Deno.env.get('GOOGLE_SMTP_FROM') || SMTP_USER || ''
// ...
from: `${fromName} <${FROM_ADDRESS}>`
```

Aucun domaine hardcodé. Aucun override de `notify.*`. Le `From` est strictement celui du secret.

---

## 5. DNS du domaine racine `dogwork-at-home.com`

Résolu via Google DoH (1.1.1.1 indisponible dans le sandbox).

| Enregistrement | Statut | Valeur observée |
|---|---|---|
| **MX Google** | ✅ OK | `1 aspmx.l.google.com`, `5 alt1/alt2`, `10 alt3/alt4` |
| **SPF Google** | ✅ OK | `v=spf1 include:_spf.google.com ~all` |
| **DKIM Google** (`google._domainkey`) | ❌ **ABSENT** | Aucune réponse TXT |
| **DMARC** (`_dmarc`) | ❌ **ABSENT** | Aucune réponse TXT |
| Vérifications Google | ✅ | 2 `google-site-verification` présents |

→ MX et SPF OK. **DKIM et DMARC manquants.**

⚠️ **Important** : DKIM/DMARC manquants **ne provoquent PAS l'erreur SMTP `invalid cmd`**. L'authentification SMTP se fait avant toute signature DKIM (qui est appliquée par Gmail côté serveur). DKIM/DMARC absents impactent uniquement la **délivrabilité** (spam/rejet côté destinataires), pas la connexion SMTP elle-même.

---

## Cause exacte / probable de l'échec SMTP

**Cause la plus probable (>90 %) :** le secret `GOOGLE_SMTP_PASSWORD` ne contient **pas un mot de passe d'application Google valide** pour `admin@dogwork-at-home.com`. Gmail renvoie `535 Username/Password not accepted`, que denomailer 1.6.0 remonte sous forme générique `invalid cmd`.

**Cause secondaire possible :** la 2FA n'est pas activée sur le compte `admin@dogwork-at-home.com` → Google refuse de créer/accepter un App Password.

---

## Actions exactes à faire (dans l'ordre)

### A. Google Admin / compte `admin@dogwork-at-home.com`
1. Se connecter à https://myaccount.google.com avec `admin@dogwork-at-home.com`.
2. **Sécurité → Validation en deux étapes → activer la 2FA** (prérequis obligatoire).
3. **Sécurité → Mots de passe des applications → Créer** :
   - Nom : `DogWork SMTP`
   - Copier les **16 caractères sans espaces** générés.
4. Dans Lovable → Cloud → Secrets → mettre à jour `GOOGLE_SMTP_PASSWORD` avec ce mot de passe d'application (sans espaces, sans guillemets).
5. Vérifier que `GOOGLE_SMTP_USER` et `GOOGLE_SMTP_FROM` valent exactement `admin@dogwork-at-home.com`.
6. Relancer le test.

### B. Google Admin Console (admin.google.com) — DKIM/DMARC pour délivrabilité
> Ces étapes ne corrigent pas l'erreur SMTP actuelle, mais sont **obligatoires avant ouverture publique** sous peine que les emails partent en spam.

1. **Apps → Google Workspace → Gmail → Authentifier l'email** → générer la clé DKIM (2048 bits) pour `dogwork-at-home.com`.
2. Copier le TXT généré (`google._domainkey`).
3. **IONOS DNS** → ajouter :
   - `google._domainkey.dogwork-at-home.com` TXT `v=DKIM1; k=rsa; p=...`
   - `_dmarc.dogwork-at-home.com` TXT `v=DMARC1; p=quarantine; rua=mailto:admin@dogwork-at-home.com; aspf=s; adkim=s`
4. Attendre 1-24 h de propagation, puis cliquer **"Commencer l'authentification"** dans Google Admin.

### C. Optionnel — mapping d'erreur côté Edge Function
L'erreur `invalid cmd` arrive hors du `try/catch` (event loop). Pour la voir proprement dans `email_send_log`, il faudrait wrap-er la création du `SMTPClient` ou catcher au niveau `Deno.serve`. **Non modifié dans cette passe** (hors scope demandé).

---

## Synthèse finale

- **Secrets présents** : `GOOGLE_SMTP_USER`, `GOOGLE_SMTP_PASSWORD`, `GOOGLE_SMTP_FROM` ✅
- **Secrets absents (non requis)** : `GOOGLE_SMTP_HOST`, `GOOGLE_SMTP_PORT` (codés en dur correctement)
- **Erreur exacte logs** : `Error: invalid cmd` dans `denomailer@1.6.0 SMTPConnection.assertCode` → réponse SMTP Gmail non attendue (très probablement `535 auth refusée`)
- **DNS manquants `dogwork-at-home.com`** : `google._domainkey` (DKIM) et `_dmarc` (DMARC). MX + SPF OK.
- **Action n°1 à faire** : régénérer un **mot de passe d'application Google** sur `admin@dogwork-at-home.com` (avec 2FA activée) et mettre à jour `GOOGLE_SMTP_PASSWORD`.
- **Code Edge Function** : ne force aucun autre `From` ni domaine. Aucune correction de code nécessaire pour cette cause.
