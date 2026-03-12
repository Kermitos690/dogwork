

# Résumé de l'architecture des comptes

L'infrastructure pour les 4 types de compte est **déjà en place** :

| Type | Rôle DB | Création | Cotisation |
|---|---|---|---|
| Utilisateur | `owner` | Auto-inscription | Starter (gratuit) / Pro / Expert |
| Éducateur | `educator` | Admin uniquement | 200 CHF/an |
| Refuge/SPA | `shelter` | Admin uniquement | Sur devis |
| Admin | `admin` | Base de données | — |

L'espace refuge est **complet et fonctionnel** :
- Dashboard avec statistiques par statut
- Gestion d'animaux (toutes espèces : chien, chat, reptile, oiseau, NAC)
- Fiche animal détaillée avec observations (médical, comportement, général)
- Filtres par espèce et statut
- RLS sécurisé + ShelterGuard

## Action nécessaire

Pour avoir un **compte SPA opérationnel de démo**, il suffit de :

1. Se connecter en tant qu'admin (`teb.gaetan@gmail.com`) dans le preview
2. Aller sur `/admin`
3. Utiliser la section "Créer un compte Refuge" pour créer un compte (email + mot de passe + nom du refuge)
4. Se déconnecter et se reconnecter avec le nouveau compte refuge

Aucune modification de code n'est requise -- tout est déjà implémenté et prêt à être présenté comme produit.

