# DogWork — SEO audit report

- **Status:** ✅ PASS
- **Generated:** 2026-05-17T10:32:33.614Z
- **Canonical host:** https://www.dogwork-at-home.com
- **Sitemap URLs:** 17
- **Errors:** 0 · **Warnings:** 17

## Routes audited

| Route | Component | Source |
|---|---|---|
| `/` | Dashboard | src/pages/Dashboard.tsx |
| `/landing` | Landing | src/pages/Landing.tsx |
| `/pricing` | PricingPage | src/pages/Pricing.tsx |
| `/annuaire/coachs` | PublicCoachDirectory | src/pages/public/PublicCoachDirectory.tsx |
| `/annuaire/refuges` | PublicShelterDirectory | src/pages/public/PublicShelterDirectory.tsx |
| `/contact` | Contact | src/pages/Contact.tsx |
| `/install` | Install | src/pages/Install.tsx |
| `/legal` | LegalPage | src/pages/Legal.tsx |
| `/legal/charte-coach` | CharteCoach | src/pages/CharteCoach.tsx |
| `/privacy` | PrivacyPage | src/pages/Privacy.tsx |
| `/terms` | TermsPage | src/pages/Terms.tsx |
| `/education-canine-lausanne` | Suspense | — |
| `/education-canine-vaud` | Suspense | — |
| `/application-education-canine` | Suspense | — |
| `/application-suivi-chien` | Suspense | — |
| `/refuges-animaux-vaud` | Suspense | — |
| `/adoption-chien-suisse-romande` | Suspense | — |

## Findings

| Severity | Route | Field | Message |
|---|---|---|---|
| 🟡 warn | `/` | <h1> | No <h1> tag found in component |
| 🟡 warn | `/landing` | <h1> | No <h1> tag found in component |
| 🟡 warn | `/annuaire/refuges` | description | description too long (176 chars, target 70–160) |
| 🟡 warn | `/contact` | title | title too short (25 chars, target 30–65) |
| 🟡 warn | `/contact` | description | description too short (31 chars, target 70–160) |
| 🟡 warn | `/contact` | <h1> | No <h1> tag found in component |
| 🟡 warn | `/install` | title | title too short (17 chars, target 30–65) |
| 🟡 warn | `/install` | description | description too short (31 chars, target 70–160) |
| 🟡 warn | `/legal` | title | title too short (26 chars, target 30–65) |
| 🟡 warn | `/privacy` | title | title too short (25 chars, target 30–65) |
| 🟡 warn | `/terms` | description | description too short (22 chars, target 70–160) |
| 🟡 warn | `/education-canine-lausanne` | file | Component <Suspense> not resolved to a source file (skipped on-page checks) |
| 🟡 warn | `/education-canine-vaud` | file | Component <Suspense> not resolved to a source file (skipped on-page checks) |
| 🟡 warn | `/application-education-canine` | file | Component <Suspense> not resolved to a source file (skipped on-page checks) |
| 🟡 warn | `/application-suivi-chien` | file | Component <Suspense> not resolved to a source file (skipped on-page checks) |
| 🟡 warn | `/refuges-animaux-vaud` | file | Component <Suspense> not resolved to a source file (skipped on-page checks) |
| 🟡 warn | `/adoption-chien-suisse-romande` | file | Component <Suspense> not resolved to a source file (skipped on-page checks) |

## Checks performed

1. `public/sitemap.xml` — every `<loc>` is on `https://www.dogwork-at-home.com`.
2. `public/robots.txt` — `Sitemap` directive on canonical host; no explicit `Allow` on private prefixes.
3. For every sitemap path: `<Route>` declared, source file resolved.
4. `<SEO title=… description=… path=… />` present with valid length (title 30–65, description 70–160).
5. `path` prop matches the route — guarantees self-referencing canonical `https://www.dogwork-at-home.com<path>`.
6. `<h1>` present in component source.
7. No duplicate `title` / `description` across public routes.
8. `index.html` ships fallback `og:*` + `twitter:*` for non-JS social crawlers, and no duplicate canonical.
