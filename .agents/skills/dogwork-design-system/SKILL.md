---
name: dogwork-design-system
description: Design system DogWork — thèmes couleur par rôle (Owner=Blue, Educator=Emerald, Admin=Amber, Shelter=Purple), responsive vertical pt-16, dark mode #15181e, identité Staffie. À déclencher pour tout sujet UI, couleur, layout, responsive, dark mode.
---

# DogWork — Design System

## Identité
- **Mascotte/focus**: Staffie (Staffordshire Bull Terrier)
- **Base color**: Blue
- **Landing videos**: responsive (desktop + vertical mobile via Remotion)
- Memory `brand/identity-system-v2`

## Thèmes par rôle (CSS variables)
| Rôle | Couleur principale |
|---|---|
| Owner / Particulier | **Blue** |
| Educator / Coach | **Emerald** |
| Admin | **Amber** |
| Shelter / Refuge | **Purple** |

Définis dans `src/index.css` (HSL). Appliqués via classes thématisées sur `RoleLayout`.

## Standards responsive
- **Mobile-first** systématique
- Layout vertical, **pas d'overlap**
- Padding top fixe: `pt-16` (header fixed)
- Containers de largeur standard (`max-w-7xl`, `max-w-4xl`)
- Memory `responsive-layout-standard`

## Dark mode
- Base: `#15181e`
- `muted-foreground` brightness 55% pour WCAG AA
- Memory `accessibility-contrast-dark-mode`

## Règles d'or
- **Jamais** de couleur directe (`text-white`, `bg-black`) dans les composants
- Toujours tokens sémantiques: `bg-background`, `text-foreground`, `bg-primary`, `border-border`, etc.
- Toujours HSL dans `index.css` + `tailwind.config.ts`
- Gradients/ombres définis comme tokens réutilisables

## Composants shadcn
- Customiser via variants (`cva`), pas via override de classes
- Variants premium (`gradient-primary`, `shadow-elegant`) pour CTA forts

## Ton produit
- Premium, sobre, chaleureux, **crédible**
- Éviter codes "jouet" / gadget / amateur
- Vues coach/refuge/admin = sérieuses, structurées, pilotables

## Layouts par rôle
- `AppLayout` — owner
- `CoachLayout` + `CoachNav`
- `ShelterLayout` + `ShelterNav`
- `EmployeeLayout` + `EmployeeNav`
- Pas de layout admin dédié (vues `/admin/*` avec `AdminGuard`)

## Redirection login
- Coaches & Shelters **skip** onboarding owner standard (memory `redirection-flux-connexion`)
- Apple OAuth: force `window.location.origin` dynamique

## États obligatoires
Pour chaque page: loading, error, empty, success. Empty states **guident** vers action utile.
