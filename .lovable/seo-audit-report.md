# DogWork — SEO audit report

- **Status:** ❌ FAIL
- **Generated:** 2026-05-17T10:33:44.913Z
- **Canonical host:** https://www.dogwork-at-home.com
- **Sitemap URLs:** 17
- **Errors:** 6 · **Warnings:** 17

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
| `/education-canine-lausanne` | EducationCanineLausanne | src/pages/seo/LocalLandings.tsx |
| `/education-canine-vaud` | EducationCanineVaud | src/pages/seo/LocalLandings.tsx |
| `/application-education-canine` | ApplicationEducationCanine | src/pages/seo/LocalLandings.tsx |
| `/application-suivi-chien` | ApplicationSuiviChien | src/pages/seo/LocalLandings.tsx |
| `/refuges-animaux-vaud` | RefugesAnimauxVaud | src/pages/seo/LocalLandings.tsx |
| `/adoption-chien-suisse-romande` | AdoptionChienSuisseRomande | src/pages/seo/LocalLandings.tsx |

## Findings

| Severity | Route | Field | Message |
|---|---|---|---|
| 🔴 error | `/education-canine-lausanne` | <SEO> | No <SEO> component in src/pages/seo/LocalLandings.tsx |
| 🔴 error | `/education-canine-vaud` | <SEO> | No <SEO> component in src/pages/seo/LocalLandings.tsx |
| 🔴 error | `/application-education-canine` | <SEO> | No <SEO> component in src/pages/seo/LocalLandings.tsx |
| 🔴 error | `/application-suivi-chien` | <SEO> | No <SEO> component in src/pages/seo/LocalLandings.tsx |
| 🔴 error | `/refuges-animaux-vaud` | <SEO> | No <SEO> component in src/pages/seo/LocalLandings.tsx |
| 🔴 error | `/adoption-chien-suisse-romande` | <SEO> | No <SEO> component in src/pages/seo/LocalLandings.tsx |
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
| 🟡 warn | `/education-canine-lausanne` | <h1> | No <h1> tag found in component |
| 🟡 warn | `/education-canine-vaud` | <h1> | No <h1> tag found in component |
| 🟡 warn | `/application-education-canine` | <h1> | No <h1> tag found in component |
| 🟡 warn | `/application-suivi-chien` | <h1> | No <h1> tag found in component |
| 🟡 warn | `/refuges-animaux-vaud` | <h1> | No <h1> tag found in component |
| 🟡 warn | `/adoption-chien-suisse-romande` | <h1> | No <h1> tag found in component |

## Checks performed

1. `public/sitemap.xml` — every `<loc>` is on `https://www.dogwork-at-home.com`.
2. `public/robots.txt` — `Sitemap` directive on canonical host; no explicit `Allow` on private prefixes.
3. For every sitemap path: `<Route>` declared, source file resolved.
4. `<SEO title=… description=… path=… />` present with valid length (title 30–65, description 70–160).
5. `path` prop matches the route — guarantees self-referencing canonical `https://www.dogwork-at-home.com<path>`.
6. `<h1>` present in component source.
7. No duplicate `title` / `description` across public routes.
8. `index.html` ships fallback `og:*` + `twitter:*` for non-JS social crawlers, and no duplicate canonical.
