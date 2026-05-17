// Post-build prerender: writes per-route dist/<path>/index.html with
// route-specific <title>, meta description, canonical, og:* and twitter:*
// tags injected into the head, so non-JS crawlers (Facebook, LinkedIn,
// Slack, Twitter, Discord) see accurate previews without executing JS.
//
// Source de vérité : src/config/seo.ts (alimente aussi <SEOHead> côté client).
// Le SPA s'hydrate normalement ; Helmet réécrit les tags pour Googlebot.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, join } from "path";
import {
  SEO_ROUTES,
  DEFAULT_OG_IMAGE_WIDTH,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_TYPE,
  DEFAULT_OG_LOCALE,
  SITE_NAME,
  type SeoRouteConfig,
} from "../src/config/seo";

const DIST = resolve("dist");

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function replaceOrAppend(html: string, regex: RegExp, replacement: string): string {
  return regex.test(html)
    ? html.replace(regex, replacement)
    : html.replace(/<\/head>/i, `    ${replacement}\n  </head>`);
}

function injectMeta(template: string, cfg: SeoRouteConfig): string {
  const title = escapeHtml(cfg.title);
  const desc = escapeHtml(cfg.description);
  const url = cfg.canonicalUrl;
  const img = cfg.ogImage;
  const alt = cfg.ogImageAlt ? escapeHtml(cfg.ogImageAlt) : null;

  let html = template;

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);

  html = replaceOrAppend(
    html,
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${desc}">`,
  );

  // og:* / twitter:*
  const pairs: Array<[RegExp, string]> = [
    [/<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${title}">`],
    [
      /<meta\s+property=["']og:description["'][^>]*>/i,
      `<meta property="og:description" content="${desc}">`,
    ],
    [/<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${url}">`],
    [/<meta\s+property=["']og:type["'][^>]*>/i, `<meta property="og:type" content="${cfg.ogType}">`],
    [/<meta\s+property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${img}">`],
    [
      /<meta\s+property=["']og:image:width["'][^>]*>/i,
      `<meta property="og:image:width" content="${DEFAULT_OG_IMAGE_WIDTH}">`,
    ],
    [
      /<meta\s+property=["']og:image:height["'][^>]*>/i,
      `<meta property="og:image:height" content="${DEFAULT_OG_IMAGE_HEIGHT}">`,
    ],
    [
      /<meta\s+property=["']og:image:type["'][^>]*>/i,
      `<meta property="og:image:type" content="${DEFAULT_OG_IMAGE_TYPE}">`,
    ],
    [
      /<meta\s+property=["']og:site_name["'][^>]*>/i,
      `<meta property="og:site_name" content="${SITE_NAME}">`,
    ],
    [
      /<meta\s+property=["']og:locale["'][^>]*>/i,
      `<meta property="og:locale" content="${DEFAULT_OG_LOCALE}">`,
    ],
    [/<meta\s+name=["']twitter:card["'][^>]*>/i, `<meta name="twitter:card" content="${cfg.twitterCard}">`],
    [/<meta\s+name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${title}">`],
    [
      /<meta\s+name=["']twitter:description["'][^>]*>/i,
      `<meta name="twitter:description" content="${desc}">`,
    ],
    [/<meta\s+name=["']twitter:image["'][^>]*>/i, `<meta name="twitter:image" content="${img}">`],
  ];
  for (const [re, repl] of pairs) html = replaceOrAppend(html, re, repl);

  if (alt) {
    html = replaceOrAppend(
      html,
      /<meta\s+property=["']og:image:alt["'][^>]*>/i,
      `<meta property="og:image:alt" content="${alt}">`,
    );
    html = replaceOrAppend(
      html,
      /<meta\s+name=["']twitter:image:alt["'][^>]*>/i,
      `<meta name="twitter:image:alt" content="${alt}">`,
    );
  }

  // Canonical (pas dans index.html par défaut — Helmet gère le cas JS).
  html = replaceOrAppend(
    html,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${url}">`,
  );

  // Robots noindex pour aliases / pages non indexables (évite duplicate content).
  if (cfg.noindex || cfg.aliasOf) {
    html = replaceOrAppend(
      html,
      /<meta\s+name=["']robots["'][^>]*>/i,
      `<meta name="robots" content="noindex,follow">`,
    );
  }

  return html;
}

function writeRouteHtml(cfg: SeoRouteConfig, template: string) {
  const html = injectMeta(template, cfg);
  if (cfg.path === "/") {
    writeFileSync(join(DIST, "index.html"), html);
    return;
  }
  const dir = join(DIST, cfg.path.replace(/^\//, ""));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
}

function main() {
  const indexPath = join(DIST, "index.html");
  if (!existsSync(indexPath)) {
    console.warn(`[prerender-meta] dist/index.html not found — skipping.`);
    return;
  }
  const template = readFileSync(indexPath, "utf8");
  for (const route of SEO_ROUTES) writeRouteHtml(route, template);
  console.log(`[prerender-meta] wrote ${SEO_ROUTES.length} route HTML files in dist/`);
}

main();
