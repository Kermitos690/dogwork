

# Différenciation visuelle des 3 espaces (Utilisateur / Coach / Admin)

## Probleme identifié

Actuellement, les trois types de comptes partagent la meme palette de couleurs (bleu `--primary`, violet `--accent`), les memes layouts quasi-identiques, et la meme densité d'information. Il est impossible de savoir "où on est" visuellement.

## Solution : Système de couleurs par rôle + simplification

Chaque espace aura sa propre **couleur signature** appliquée aux éléments structurants (header, nav active, accents, gradients hero) :

```text
┌─────────────┬──────────────────┬──────────────────┐
│ Utilisateur │    Coach         │    Admin          │
├─────────────┼──────────────────┼──────────────────┤
│ Bleu        │ Émeraude/Vert    │ Rouge/Ambre       │
│ hsl(210...) │ hsl(160...)      │ hsl(0...)         │
│ Actuel      │ Nouveau          │ Nouveau           │
└─────────────┴──────────────────┴──────────────────┘
```

## Changements prévus

### 1. Variables CSS par rôle (`index.css`)
Ajouter des classes utilitaires `.theme-coach` et `.theme-admin` qui redéfinissent `--primary`, `--ring`, et les gradients hero pour chaque espace.