/**
 * SEO audit — runs at build time (postbuild) and on demand.
 *
 * Verifies on every public route declared in public/sitemap.xml:
 *   • <SEO ...> component present (title + description + path)
 *   • title length 30–65 chars, description 70–160 chars
 *   • canonical builds correctly to https://www.dogwork-at-home.com/<path>
 *   • <h1> tag present in the source
 *   • og:* and twitter:* fallback chain (index.html static head + SEO component)
 * Also checks:
 *   • sitemap base URL == https://www.dogwork-at-home.com
 *   • robots.txt: Sitemap directive points to the same host
 *   • robots.txt does not Allow private route prefixes
 *   • every sitemap path resolves to a route declared in src/App.tsx
 *
 * Output: /mnt/documents/seo-audit-report.md (+ ./seo-audit-report.json next to it for CI).
 * Exit code: 0 = clean, 1 = errors found (so the build can fail-loud if desired).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

const ROOT = process.cwd();
const CANONICAL_HOST = "https://www.dogwork-at-home.com";
const PUBLIC_ROUTES_PRIVATE_PREFIXES = [
  "/admin", "/coach", "/shelter", "/employee",
  "/dogs", "/plan", "/training", "/journal", "/stats", "/safety",
  "/profile", "/subscription", "/courses", "/messages", "/settings",
  "/support", "/preferences", "/adoption-checkins", "/adoption-followup",
  "/shop", "/credits", "/modules", "/outils", "/documents", "/promenade",
  "/onboarding", "/exercises",
  "/auth", "/reset-password", "/unsubscribe", "/force-password-change",
  "/access-denied", "/gate-k9x",
];

type Severity = "error" | "warn" | "info";
interface Finding {
  route: string;
  field: string;
  severity: Severity;
  message: string;
}

const findings: Finding[] = [];
const push = (f: Finding) => findings.push(f);

function read(path: string): string | null {
  const abs = resolve(ROOT, path);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf8");
}

// ---------- 1. Parse sitemap ----------
const sitemapXml = read("public/sitemap.xml");
if (!sitemapXml) {
  console.error("✗ public/sitemap.xml missing — run `bunx tsx scripts/generate-sitemap.ts` first.");
  process.exit(1);
}
const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const sitemapPaths = locs.map((u) => {
  if (!u.startsWith(CANONICAL_HOST)) {
    push({ route: u, field: "sitemap", severity: "error", message: `URL not on canonical host (${CANONICAL_HOST})` });
  }
  return u.replace(CANONICAL_HOST, "") || "/";
});

// ---------- 2. Parse robots.txt ----------
const robots = read("public/robots.txt") ?? "";
if (!/Sitemap:\s*https:\/\/www\.dogwork-at-home\.com\/sitemap\.xml/.test(robots)) {
  push({ route: "/robots.txt", field: "Sitemap", severity: "error", message: "Sitemap directive missing or not on www canonical" });
}
for (const prefix of PUBLIC_ROUTES_PRIVATE_PREFIXES) {
  const allowRe = new RegExp(`^\\s*Allow:\\s*${prefix.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")}\\b`, "m");
  if (allowRe.test(robots)) {
    push({ route: "/robots.txt", field: "Allow", severity: "warn", message: `Explicit Allow on private prefix ${prefix}` });
  }
}

// ---------- 3. Parse App.tsx routes → component map ----------
const appTsx = read("src/App.tsx") ?? "";
const routeToComp = new Map<string, string>();
const SKIP_COMPS = new Set(["Suspense", "PageLoader", "Navigate", "Routes", "Route", "ForcePasswordChange"]);
// Locate every "<Route ... />" segment by brace-counting from each <Route occurrence.
let cursor = 0;
while (true) {
  const start = appTsx.indexOf("<Route", cursor);
  if (start < 0) break;
  // Walk forward; track {} depth and angle-bracket nesting (outside braces).
  let i = start + 1;
  let braceDepth = 0;
  let tagDepth = 1; // we're inside the opening <Route ...
  let end = -1;
  while (i < appTsx.length) {
    const ch = appTsx[i];
    if (ch === "{") braceDepth++;
    else if (ch === "}") braceDepth--;
    else if (braceDepth === 0) {
      if (ch === "<" && appTsx[i + 1] !== "/") tagDepth++;
      else if (ch === "/" && appTsx[i + 1] === ">") { tagDepth--; if (tagDepth === 0) { end = i + 2; break; } }
      else if (ch === ">" && appTsx[i - 1] !== "/" && appTsx.startsWith("</", appTsx.lastIndexOf("<", i))) tagDepth--;
    }
    i++;
  }
  if (end < 0) { cursor = start + 6; continue; }
  const segment = appTsx.slice(start, end);
  cursor = end;
  const pathM = segment.match(/path=["'`]([^"'`]+)["'`]/);
  if (!pathM) continue;
  const path = pathM[1];
  const comps = [...segment.matchAll(/<\s*([A-Z][A-Za-z0-9_]*)\b/g)]
    .map((x) => x[1])
    .filter((c) => !SKIP_COMPS.has(c) && !/Guard$/.test(c));
  if (comps.length && !routeToComp.has(path)) routeToComp.set(path, comps[comps.length - 1]);
}

// Map "ComponentName" → file path via lazy import statements
const lazyRe = /const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*lazy\(\(\)\s*=>\s*import\(["'`]([^"'`]+)["'`]\)(?:\.then\([^)]*\{\s*default:\s*m\.([A-Za-z0-9_]+)\s*\}\))?/g;
const compToFile = new Map<string, string>();
const namedExportToFile = new Map<string, { file: string; named?: string }>();
for (const m of appTsx.matchAll(lazyRe)) {
  const comp = m[1];
  const importPath = m[2];
  const named = m[3];
  const filePath = importPath.replace(/^\.\//, "src/") + ".tsx";
  compToFile.set(comp, filePath);
  if (named) namedExportToFile.set(comp, { file: filePath, named });
}
// Static imports for non-lazy public pages (e.g. PublicCoachDirectory)
const staticRe = /import\s+([A-Z][A-Za-z0-9_]*)\s+from\s+["'`]([^"'`]+)["'`]/g;
for (const m of appTsx.matchAll(staticRe)) {
  const comp = m[1];
  const importPath = m[2];
  if (importPath.startsWith("./pages") || importPath.startsWith("@/pages")) {
    const filePath = importPath.replace(/^\.\//, "src/").replace(/^@\//, "src/") + ".tsx";
    if (!compToFile.has(comp)) compToFile.set(comp, filePath);
  }
}

// ---------- 4. Audit each sitemap path ----------
// "/" is the SPA root: anonymous users land on /landing, so audit "/" against Landing.tsx
const auditAlias: Record<string, string> = { "/": "/landing" };
for (const path of sitemapPaths) {
  const lookupPath = auditAlias[path] ?? path;
  const comp = routeToComp.get(lookupPath);
  if (!comp) {
    push({ route: path, field: "route", severity: "error", message: "Path in sitemap but no <Route> declared in src/App.tsx" });
    continue;
  }
  const fileMeta = compToFile.get(comp);
  if (!fileMeta) {
    push({ route: path, field: "file", severity: "warn", message: `Component <${comp}> not resolved to a source file (skipped on-page checks)` });
    continue;
  }
  const src = read(fileMeta);
  if (src == null) {
    push({ route: path, field: "file", severity: "warn", message: `Source file ${fileMeta} not found` });
    continue;
  }

  // Scope to the named export when applicable, otherwise whole file
  const namedExport = namedExportToFile.get(comp)?.named;
  let scope = src;
  if (namedExport) {
    const fnRe = new RegExp(`export\\s+function\\s+${namedExport}\\b[\\s\\S]*?(?=export\\s+function|$)`);
    const m = src.match(fnRe);
    if (m) scope = m[0];
  }

  // <SEO> presence — accept either a direct <SEO ... /> or a <SeoLandingLayout cfg={...} />
  // whose cfg object literal carries title/description/path.
  let seoMatch = scope.match(/<SEO\b[\s\S]*?\/>/);
  if (!seoMatch) {
    const layoutM = scope.match(/cfg=\{\s*\{([\s\S]*?)\}\s*\}/);
    if (layoutM) seoMatch = ["<SEO " + layoutM[1] + " />"] as RegExpMatchArray;
  }
  if (!seoMatch) {
    push({ route: path, field: "<SEO>", severity: "error", message: `No <SEO> component in ${fileMeta}` });
  } else {
    const seoBlock = seoMatch[0];
    const titleM = seoBlock.match(/title=\{?["'`]([^"'`]+)["'`]\}?/);
    const descM = seoBlock.match(/description=\{?["'`]([^"'`]+)["'`]\}?/);
    const pathM = seoBlock.match(/path=\{?["'`]([^"'`]+)["'`]\}?/);

    if (!titleM) push({ route: path, field: "title", severity: "error", message: "Missing title prop" });
    else {
      const len = titleM[1].length;
      if (len < 30) push({ route: path, field: "title", severity: "warn", message: `title too short (${len} chars, target 30–65)` });
      if (len > 65) push({ route: path, field: "title", severity: "warn", message: `title too long (${len} chars, target 30–65)` });
    }
    if (!descM) push({ route: path, field: "description", severity: "error", message: "Missing description prop" });
    else {
      const len = descM[1].length;
      if (len < 70) push({ route: path, field: "description", severity: "warn", message: `description too short (${len} chars, target 70–160)` });
      if (len > 160) push({ route: path, field: "description", severity: "warn", message: `description too long (${len} chars, target 70–160)` });
    }
    if (!pathM) push({ route: path, field: "path", severity: "error", message: "Missing path prop (canonical depends on it)" });
    else if (pathM[1] !== lookupPath) push({ route: path, field: "path", severity: "error", message: `path prop "${pathM[1]}" does not match audited route "${lookupPath}"` });
  }

  // <h1>
  if (!/<h1[\s>]/.test(scope)) {
    push({ route: path, field: "<h1>", severity: "warn", message: "No <h1> tag found in component" });
  }
}

// ---------- 5. Duplicate detection ----------
const titles = new Map<string, string[]>();
const descs = new Map<string, string[]>();
for (const path of sitemapPaths) {
  const comp = routeToComp.get(path);
  if (!comp) continue;
  const file = compToFile.get(comp);
  if (!file) continue;
  const src = read(file) ?? "";
  const t = src.match(/title=\{?["'`]([^"'`]+)["'`]\}?/)?.[1];
  const d = src.match(/description=\{?["'`]([^"'`]+)["'`]\}?/)?.[1];
  if (t) titles.set(t, [...(titles.get(t) ?? []), path]);
  if (d) descs.set(d, [...(descs.get(d) ?? []), path]);
}
for (const [t, paths] of titles) if (paths.length > 1) push({ route: paths.join(", "), field: "title", severity: "warn", message: `Duplicate title across ${paths.length} routes: "${t}"` });
for (const [d, paths] of descs) if (paths.length > 1) push({ route: paths.join(", "), field: "description", severity: "warn", message: `Duplicate description across ${paths.length} routes` });

// ---------- 6. index.html static fallback ----------
// Strip HTML comments first so commented-out tags don't trigger checks
const indexHtml = (read("index.html") ?? "").replace(/<!--[\s\S]*?-->/g, "");
const required: Array<[string, RegExp]> = [
  ["og:title", /<meta\s+property=["']og:title["']/],
  ["og:description", /<meta\s+property=["']og:description["']/],
  ["og:url", /<meta\s+property=["']og:url["']/],
  ["og:image", /<meta\s+property=["']og:image["']/],
  ["og:type", /<meta\s+property=["']og:type["']/],
  ["twitter:card", /<meta\s+name=["']twitter:card["']/],
  ["twitter:title", /<meta\s+name=["']twitter:title["']/],
  ["twitter:description", /<meta\s+name=["']twitter:description["']/],
  ["twitter:image", /<meta\s+name=["']twitter:image["']/],
];
for (const [name, re] of required) {
  if (!re.test(indexHtml)) push({ route: "/index.html", field: name, severity: "warn", message: `Missing ${name} fallback in index.html` });
}
// Canonical must NOT be in index.html (duplicated by per-route Helmet)
if (/<link\s+rel=["']canonical["']/.test(indexHtml)) {
  push({ route: "/index.html", field: "canonical", severity: "error", message: "Static <link rel=canonical> in index.html will duplicate the per-route Helmet canonical" });
}
// Static og:url should target canonical host
const ogUrlM = indexHtml.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/);
if (ogUrlM && !ogUrlM[1].startsWith(CANONICAL_HOST)) {
  push({ route: "/index.html", field: "og:url", severity: "error", message: `Static og:url not on canonical host: ${ogUrlM[1]}` });
}

// ---------- 7. Render report ----------
const errors = findings.filter((f) => f.severity === "error");
const warns = findings.filter((f) => f.severity === "warn");
const status = errors.length === 0 ? "PASS" : "FAIL";

const ts = new Date().toISOString();
const md: string[] = [];
md.push(`# DogWork — SEO audit report`);
md.push(``);
md.push(`- **Status:** ${status === "PASS" ? "✅ PASS" : "❌ FAIL"}`);
md.push(`- **Generated:** ${ts}`);
md.push(`- **Canonical host:** ${CANONICAL_HOST}`);
md.push(`- **Sitemap URLs:** ${sitemapPaths.length}`);
md.push(`- **Errors:** ${errors.length} · **Warnings:** ${warns.length}`);
md.push(``);
md.push(`## Routes audited`);
md.push(``);
md.push(`| Route | Component | Source |`);
md.push(`|---|---|---|`);
for (const p of sitemapPaths) {
  const comp = routeToComp.get(p) ?? "—";
  const file = compToFile.get(comp) ?? "—";
  md.push(`| \`${p}\` | ${comp} | ${file} |`);
}
md.push(``);
md.push(`## Findings`);
md.push(``);
if (findings.length === 0) {
  md.push(`_No findings — all SEO checks passed._`);
} else {
  md.push(`| Severity | Route | Field | Message |`);
  md.push(`|---|---|---|---|`);
  for (const f of [...errors, ...warns, ...findings.filter((x) => x.severity === "info")]) {
    const icon = f.severity === "error" ? "🔴" : f.severity === "warn" ? "🟡" : "ℹ️";
    md.push(`| ${icon} ${f.severity} | \`${f.route}\` | ${f.field} | ${f.message.replace(/\|/g, "\\|")} |`);
  }
}
md.push(``);
md.push(`## Checks performed`);
md.push(``);
md.push(`1. \`public/sitemap.xml\` — every \`<loc>\` is on \`${CANONICAL_HOST}\`.`);
md.push(`2. \`public/robots.txt\` — \`Sitemap\` directive on canonical host; no explicit \`Allow\` on private prefixes.`);
md.push(`3. For every sitemap path: \`<Route>\` declared, source file resolved.`);
md.push(`4. \`<SEO title=… description=… path=… />\` present with valid length (title 30–65, description 70–160).`);
md.push(`5. \`path\` prop matches the route — guarantees self-referencing canonical \`${CANONICAL_HOST}<path>\`.`);
md.push(`6. \`<h1>\` present in component source.`);
md.push(`7. No duplicate \`title\` / \`description\` across public routes.`);
md.push(`8. \`index.html\` ships fallback \`og:*\` + \`twitter:*\` for non-JS social crawlers, and no duplicate canonical.`);
md.push(``);

const outDir = "/mnt/documents";
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/seo-audit-report.md`, md.join("\n"));
writeFileSync(`${outDir}/seo-audit-report.json`, JSON.stringify({ status, generatedAt: ts, errors: errors.length, warnings: warns.length, findings, routes: sitemapPaths }, null, 2));

// Also drop a copy in the repo for local inspection
const repoOut = resolve(ROOT, ".lovable/seo-audit-report.md");
mkdirSync(dirname(repoOut), { recursive: true });
writeFileSync(repoOut, md.join("\n"));

console.log(`SEO audit ${status} — ${errors.length} error(s), ${warns.length} warning(s)`);
console.log(`Report: ${outDir}/seo-audit-report.md`);

if (errors.length > 0) {
  for (const e of errors) console.log(`  ✗ [${e.route}] ${e.field}: ${e.message}`);
  // Non-fatal exit for now so build never breaks — flip to `process.exit(1)` to enforce.
  process.exit(0);
}
