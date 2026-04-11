# Plan : Synchronisation complète Test → Production

## Diagnostic


| Donnée                          | Test                     | Production                 | Action       |
| ------------------------------- | ------------------------ | -------------------------- | ------------ |
| Exercices                       | 480                      | **0**                      | Sync via RPC |
| Fichier catalogue (storage)     | ✅ présent                | **absent**                 | Cause racine |
| Coûts IA (`ai_feature_catalog`) | Mis à jour (1-5 crédits) | Anciens (2-10 crédits)     | Aligner      |
| Quotas IA (`ai_plan_quotas`)    | Serrés (1/5/15/20/30)    | Anciens (5/30/100/150/200) | Aligner      |
| Plans                           | &nbsp;                   | &nbsp;                     | &nbsp;       |
