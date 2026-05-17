// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
// Keep this file as the single source of truth for the public sitemap.
// Add only PUBLIC, indexable routes — never private/app/dashboard routes.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://www.dogwork-at-home.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const today = new Date().toISOString().slice(0, 10);

const entries: SitemapEntry[] = [
  // Acquisition / homepage
  { path: "/", changefreq: "weekly", priority: "1.0", lastmod: today },
  { path: "/landing", changefreq: "weekly", priority: "0.9", lastmod: today },

  // Offre & pricing
  { path: "/pricing", changefreq: "monthly", priority: "0.9", lastmod: today },

  // Annuaires publics (éducateurs / refuges)
  { path: "/annuaire/coachs", changefreq: "weekly", priority: "0.8", lastmod: today },
  { path: "/annuaire/refuges", changefreq: "weekly", priority: "0.8", lastmod: today },

  // Contact & install
  { path: "/contact", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/install", changefreq: "monthly", priority: "0.6", lastmod: today },

  // Légal
  { path: "/legal", changefreq: "yearly", priority: "0.3", lastmod: today },
  { path: "/legal/charte-coach", changefreq: "yearly", priority: "0.3", lastmod: today },
  { path: "/privacy", changefreq: "yearly", priority: "0.3", lastmod: today },
  { path: "/terms", changefreq: "yearly", priority: "0.3", lastmod: today },

  // SEO landing pages — Suisse romande long-tail acquisition
  { path: "/education-canine-lausanne", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/education-canine-vaud", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/application-education-canine", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/application-suivi-chien", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/suivi-comportement-chien", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/refuges-animaux-vaud", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/adoption-chien-suisse-romande", changefreq: "monthly", priority: "0.7", lastmod: today },
];

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    ``,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries) → ${BASE_URL}`);
