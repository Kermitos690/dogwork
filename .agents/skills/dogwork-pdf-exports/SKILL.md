---
name: dogwork-pdf-exports
description: Génération PDF/DOCX brandés DogWork (PDF Renderer v2, sections sémantiques colorées, emojis auto). À déclencher pour tout sujet export, PDF, DOCX, impression, génération document.
---

# DogWork — PDF & Document Exports

## PDF Renderer v2
- HTML imprimable brandé DogWork
- **Sections sémantiques** colorées par type (observation, conseil, alerte, succès)
- **Emojis auto** ajoutés selon contexte
- Memory `pdf-renderer-v2`
- Fichier: `src/lib/pdfRenderer.ts`

## DOCX Renderer
- `src/lib/docxRenderer.ts`
- Utilisé pour exports éditables (plans, comptes-rendus coach)

## Cas d'usage
- Plans d'entraînement générés par AI
- Comptes-rendus séance coach
- Carnet de suivi chien
- Plan d'adoption post-refuge
- Fiche de présentation animal refuge

## Pattern
1. Composer HTML structuré avec classes sémantiques (`.observation`, `.tip`, `.warning`)
2. Renderer injecte CSS brand (couleur rôle, logo, footer)
3. Export via `window.print()` ou jsPDF selon contexte
4. Pour DOCX: `docx` library + structure paragraphs/runs

## Branding
- Header: logo DogWork + nom user/coach/refuge
- Footer: URL `dogwork-at-home.com` + date génération
- Couleurs respectent thème rôle

## QA visuelle obligatoire
Avant livrer un export généré:
1. Render page par page en image (puppeteer/playwright ou similaire)
2. Vérifier: pas de texte coupé, layouts intacts, couleurs OK, ordre correct
3. Re-générer si défaut

## Crédits IA
Les exports issus d'une génération AI **déduisent les crédits côté generation**, pas côté export (l'export est gratuit).
