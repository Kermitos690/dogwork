# DogWork — SEO audit report

- **Status:** ❌ FAIL
- **Generated:** 2026-05-17T10:34:20.995Z
- **Canonical host:** https://www.dogwork-at-home.com
- **Sitemap URLs:** 17
- **Errors:** 14 · **Warnings:** 2

## Routes audited

| Route | Component | Source |
|---|---|---|
| `/` | — | — |
| `/landing` | GuidedTour | @/components/GuidedTour.tsx |
| `/pricing` | PricingPage | src/pages/Pricing.tsx |
| `/annuaire/coachs` | — | — |
| `/annuaire/refuges` | — | — |
| `/contact` | — | — |
| `/install` | — | — |
| `/legal` | — | — |
| `/legal/charte-coach` | — | — |
| `/privacy` | — | — |
| `/terms` | — | — |
| `/education-canine-lausanne` | — | — |
| `/education-canine-vaud` | — | — |
| `/application-education-canine` | — | — |
| `/application-suivi-chien` | — | — |
| `/refuges-animaux-vaud` | — | — |
| `/adoption-chien-suisse-romande` | — | — |

## Findings

| Severity | Route | Field | Message |
|---|---|---|---|
| 🔴 error | `/annuaire/coachs` | route | Path in sitemap but no <Route> declared in src/App.tsx |
| 🔴 error | `/annuaire/refuges` | route | Path in sitemap but no <Route> declared in src/App.tsx |
| 🔴 error | `/contact` | route | Path in sitemap but no <Route> declared in src/App.tsx |
| 🔴 error | `/install` | route | Path in sitemap but no <Route> declared in src/App.tsx |
| 🔴 error | `/legal` | route | Path in sitemap but no <Route> declared in src/App.tsx |
| 🔴 error | `/legal/charte-coach` | route | Path in sitemap but no <Route> declared in src/App.tsx |
| 🔴 error | `/privacy` | route | Path in sitemap but no <Route> declared in src/App.tsx |
| 🔴 error | `/terms` | route | Path in sitemap but no <Route> declared in src/App.tsx |
| 🔴 error | `/education-canine-lausanne` | route | Path in sitemap but no <Route> declared in src/App.tsx |
| 🔴 error | `/education-canine-vaud` | route | Path in sitemap but no <Route> declared in src/App.tsx |
| 🔴 error | `/application-education-canine` | route | Path in sitemap but no <Route> declared in src/App.tsx |
| 🔴 error | `/application-suivi-chien` | route | Path in sitemap but no <Route> declared in src/App.tsx |
| 🔴 error | `/refuges-animaux-vaud` | route | Path in sitemap but no <Route> declared in src/App.tsx |
| 🔴 error | `/adoption-chien-suisse-romande` | route | Path in sitemap but no <Route> declared in src/App.tsx |
| 🟡 warn | `/` | file | Source file @/components/GuidedTour.tsx not found |
| 🟡 warn | `/landing` | file | Source file @/components/GuidedTour.tsx not found |

## Checks performed

1. `public/sitemap.xml` — every `<loc>` is on `https://www.dogwork-at-home.com`.
2. `public/robots.txt` — `Sitemap` directive on canonical host; no explicit `Allow` on private prefixes.
3. For every sitemap path: `<Route>` declared, source file resolved.
4. `<SEO title=… description=… path=… />` present with valid length (title 30–65, description 70–160).
5. `path` prop matches the route — guarantees self-referencing canonical `https://www.dogwork-at-home.com<path>`.
6. `<h1>` present in component source.
7. No duplicate `title` / `description` across public routes.
8. `index.html` ships fallback `og:*` + `twitter:*` for non-JS social crawlers, and no duplicate canonical.
