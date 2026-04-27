// DogWork — Universal printable HTML renderer for AI exports.
//
// Goal: produce a beautiful, branded, emoji-safe, user-readable PDF
// directly from the browser print dialog. Supports both free-text
// (markdown-ish) and structured plan-like objects.

import logoUrl from "@/assets/logo-dogwork.png";

interface BuildOptions {
  title: string;
  summary?: string | null;
  content: unknown;
  /** Optional role label rendered as a brand pill ("Propriétaire", "Coach"…). */
  contextLabel?: string;
}

const BRAND_GRADIENT = "linear-gradient(135deg,#F97316 0%,#EA580C 60%,#C2410C 100%)";
const INK = "#1a1a2e";
const MUTED = "#5b6170";
const SOFT_BG = "#FFF7ED";
const RULE = "#F1E5D6";

/** Build a fully styled HTML document ready to be `window.print()`-ed. */
export function buildPrintableHtml(opts: BuildOptions): string {
  const { title, summary, content, contextLabel } = opts;
  const body = renderContent(content);
  const safeTitle = escapeHtml(title || "Document DogWork");
  const safeSummary = summary ? escapeHtml(summary) : "";
  const safeContext = contextLabel ? escapeHtml(contextLabel) : "";
  const dateStr = new Date().toLocaleDateString("fr-CH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${safeTitle} — DogWork</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#fff;color:${INK};-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{
    font-family:"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Helvetica,Arial,sans-serif;
    line-height:1.6;font-size:13.5px;
  }
  .page{max-width:760px;margin:0 auto;padding:28px 32px 48px}

  /* ── Header ── */
  .brand{
    display:flex;align-items:center;gap:14px;
    padding:18px 22px;border-radius:18px;color:#fff;
    background:${BRAND_GRADIENT};
    box-shadow:0 10px 30px -12px rgba(249,115,22,.45);
  }
  .brand img{height:42px;width:42px;border-radius:10px;background:#fff;padding:4px;object-fit:contain}
  .brand .b-name{font-size:20px;font-weight:800;letter-spacing:-.01em;line-height:1.1}
  .brand .b-tag{font-size:11px;opacity:.92;font-weight:500;margin-top:2px}
  .brand .b-meta{margin-left:auto;text-align:right;font-size:11px;opacity:.95}
  .brand .b-meta strong{display:block;font-size:13px;font-weight:700}

  /* ── Title block ── */
  .title-block{margin:26px 0 18px}
  .pill{
    display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
    color:#C2410C;background:${SOFT_BG};border:1px solid #FED7AA;
    padding:4px 10px;border-radius:999px;margin-bottom:10px;
  }
  h1.doc-title{font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-.02em;margin:0 0 8px;color:${INK}}
  .summary{
    font-size:14px;color:${MUTED};font-style:italic;
    border-left:3px solid #F97316;padding:6px 0 6px 12px;margin:10px 0 0;
  }

  /* ── Body typography ── */
  .body{margin-top:18px}
  .body h2{font-size:18px;font-weight:700;color:${INK};margin:22px 0 8px;letter-spacing:-.01em;border-bottom:1px solid ${RULE};padding-bottom:6px}
  .body h3{font-size:15px;font-weight:700;color:${INK};margin:18px 0 6px}
  .body h4{font-size:13.5px;font-weight:600;color:#C2410C;margin:14px 0 4px;text-transform:uppercase;letter-spacing:.03em}
  .body p{margin:0 0 10px;color:#2a2d3a}
  .body ul,.body ol{margin:0 0 12px;padding-left:22px}
  .body li{margin:4px 0;color:#2a2d3a}
  .body ul li::marker{color:#F97316}
  .body ol li::marker{color:#F97316;font-weight:700}
  .body strong{color:${INK};font-weight:700}
  .body em{color:#7a4a1a}
  .body code{background:${SOFT_BG};color:#C2410C;padding:1px 6px;border-radius:4px;font-size:12px;font-family:ui-monospace,Menlo,Consolas,monospace}
  .body hr{border:0;border-top:1px solid ${RULE};margin:18px 0}

  /* ── Cards & sections ── */
  .card{border:1px solid ${RULE};border-radius:12px;padding:14px 16px;margin:12px 0;background:#fffdf9}
  .card .c-title{font-weight:700;color:${INK};margin:0 0 6px;display:flex;align-items:center;gap:8px}
  .card .c-title .dot{width:8px;height:8px;border-radius:50%;background:#F97316}

  .week{
    border:1px solid ${RULE};border-radius:12px;overflow:hidden;margin:10px 0 14px;background:#fff;
    page-break-inside:avoid;break-inside:avoid;
  }
  .week-head{
    background:${SOFT_BG};color:#9A3412;font-weight:700;font-size:13px;
    padding:8px 14px;border-bottom:1px solid ${RULE};display:flex;align-items:center;gap:8px;
  }
  .week-head .num{
    background:#F97316;color:#fff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;
  }
  .task{padding:10px 14px;border-top:1px solid #FAF1E2}
  .task:first-child{border-top:0}
  .task .t-title{font-weight:600;color:${INK};margin:0 0 2px}
  .task .t-desc{font-size:12.5px;color:${MUTED};margin:0}

  .meta-grid{
    display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;
    border:1px solid ${RULE};border-radius:10px;padding:10px 14px;background:#fffdf9;margin:10px 0;
  }
  .meta-grid div{display:flex;justify-content:space-between;font-size:12.5px}
  .meta-grid dt{color:${MUTED}}
  .meta-grid dd{margin:0;font-weight:600;color:${INK}}

  /* ── Footer ── */
  .footer{
    margin-top:32px;padding-top:14px;border-top:1px solid ${RULE};
    color:${MUTED};font-size:10.5px;text-align:center;
  }
  .footer strong{color:#C2410C}

  /* ── Print rules ── */
  @page{size:A4;margin:14mm}
  @media print{
    .page{padding:0}
    .brand{box-shadow:none}
    h1.doc-title,h2,h3{break-after:avoid}
    .week,.card{break-inside:avoid}
  }
</style>
</head>
<body>
  <main class="page">
    <header class="brand">
      <img src="${logoUrl}" alt="DogWork" />
      <div>
        <div class="b-name">DogWork</div>
        <div class="b-tag">L'éducation canine intelligente</div>
      </div>
      <div class="b-meta">
        <strong>Document IA</strong>
        ${dateStr}
      </div>
    </header>

    <section class="title-block">
      ${safeContext ? `<span class="pill">${safeContext}</span>` : ""}
      <h1 class="doc-title">${safeTitle}</h1>
      ${safeSummary ? `<p class="summary">${safeSummary}</p>` : ""}
    </section>

    <section class="body">
      ${body}
    </section>

    <footer class="footer">
      Généré par <strong>DogWork</strong> · dogwork-at-home.com<br/>
      Ce document est personnel. Conservez-le précieusement.
    </footer>
  </main>
</body>
</html>`;
}

/** Open the printable view in a new window and trigger the native print dialog. */
export function printDocument(opts: BuildOptions): boolean {
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) return false;
  win.document.open();
  win.document.write(buildPrintableHtml(opts));
  win.document.close();
  // Wait for fonts/images to settle before printing.
  const fire = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* noop */
    }
  };
  // Image onload + safety timeout.
  const img = win.document.querySelector("img");
  if (img && !(img as HTMLImageElement).complete) {
    img.addEventListener("load", () => setTimeout(fire, 150));
    setTimeout(fire, 1200);
  } else {
    setTimeout(fire, 250);
  }
  return true;
}

// ─── Content → HTML ────────────────────────────────────────────────

function renderContent(content: unknown): string {
  if (content == null) return `<p><em>Aucun contenu.</em></p>`;
  if (typeof content === "string") return mdToHtml(content);
  if (typeof content !== "object") return `<p>${escapeHtml(String(content))}</p>`;

  const obj = content as Record<string, unknown>;

  // agent-runner shape
  if (typeof obj.text === "string" && obj.text.trim()) {
    return mdToHtml(obj.text) + renderDogContext(obj);
  }

  // plan-like
  if ("tasks" in obj || "objectives" in obj || "duration_weeks" in obj || "days" in obj) {
    return renderPlan(obj);
  }

  return renderStructured(obj);
}

function renderPlan(plan: Record<string, unknown>): string {
  const parts: string[] = [];

  const description = typeof plan.description === "string" ? plan.description : "";
  const duration = plan.duration_weeks as number | undefined;
  const objectives = Array.isArray(plan.objectives) ? (plan.objectives as unknown[]) : [];
  const tasks = Array.isArray(plan.tasks) ? (plan.tasks as Array<Record<string, unknown>>) : [];

  if (description) parts.push(`<p>${escapeHtml(description)}</p>`);

  const meta: string[] = [];
  if (duration != null) meta.push(metaRow("⏱ Durée", `${duration} semaine${duration > 1 ? "s" : ""}`));
  if (typeof plan.level === "string") meta.push(metaRow("📊 Niveau", plan.level));
  if (typeof plan.dog_name === "string") meta.push(metaRow("🐕 Chien", plan.dog_name));
  if (typeof plan.frequency === "string") meta.push(metaRow("📅 Fréquence", plan.frequency));
  if (meta.length) parts.push(`<dl class="meta-grid">${meta.join("")}</dl>`);

  if (objectives.length) {
    parts.push(`<h2>🎯 Objectifs</h2><ul>${objectives.map((o) => `<li>${escapeHtml(String(o))}</li>`).join("")}</ul>`);
  }

  if (tasks.length) {
    const byWeek = new Map<number, Array<Record<string, unknown>>>();
    for (const t of tasks) {
      const w = Number(t.week_number ?? t.week ?? 0);
      if (!byWeek.has(w)) byWeek.set(w, []);
      byWeek.get(w)!.push(t);
    }
    const weeks = Array.from(byWeek.keys()).sort((a, b) => a - b);
    parts.push(`<h2>📋 Programme</h2>`);
    for (const w of weeks) {
      const label = w === 0 ? "À tout moment" : `Semaine ${w}`;
      const items = byWeek
        .get(w)!
        .map((t) => {
          const ti = escapeHtml(String(t.title ?? "Tâche"));
          const de = t.description ? `<p class="t-desc">${escapeHtml(String(t.description))}</p>` : "";
          return `<div class="task"><p class="t-title">${ti}</p>${de}</div>`;
        })
        .join("");
      parts.push(`<div class="week"><div class="week-head"><span class="num">${w || "★"}</span>${escapeHtml(label)}</div>${items}</div>`);
    }
  }

  return parts.join("\n") || `<p><em>Plan vide.</em></p>`;
}

function renderDogContext(obj: Record<string, unknown>): string {
  const dp = obj.dog_profile as Record<string, unknown> | undefined;
  if (!dp || typeof dp !== "object") return "";
  const rows: string[] = [];
  if (dp.name) rows.push(metaRow("🐕 Chien", String(dp.name)));
  if (dp.breed) rows.push(metaRow("🧬 Race", String(dp.breed)));
  if (dp.age_years != null) rows.push(metaRow("🎂 Âge", `${dp.age_years} an(s)`));
  if (dp.threshold_distance_m != null) rows.push(metaRow("📏 Distance de confort", `${dp.threshold_distance_m} m`));
  if (!rows.length) return "";
  return `<h3>Contexte du chien</h3><dl class="meta-grid">${rows.join("")}</dl>`;
}

function renderStructured(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj).filter(([, v]) => v != null && v !== "");
  if (!entries.length) return `<p><em>Document vide.</em></p>`;
  return entries
    .map(([k, v]) => `<h2>${escapeHtml(humanize(k))}</h2>${renderValue(v)}`)
    .join("\n");
}

function renderValue(v: unknown): string {
  if (v == null) return `<p>—</p>`;
  if (typeof v === "string") return mdToHtml(v);
  if (typeof v === "number" || typeof v === "boolean") return `<p>${escapeHtml(String(v))}</p>`;
  if (Array.isArray(v)) {
    if (!v.length) return `<p>—</p>`;
    return `<ul>${v
      .map((it) => {
        if (typeof it === "string" || typeof it === "number") return `<li>${escapeHtml(String(it))}</li>`;
        if (typeof it === "object" && it && "title" in (it as object))
          return `<li>${escapeHtml(String((it as Record<string, unknown>).title))}</li>`;
        return `<li>${escapeHtml(JSON.stringify(it))}</li>`;
      })
      .join("")}</ul>`;
  }
  if (typeof v === "object") return renderStructured(v as Record<string, unknown>);
  return `<p>${escapeHtml(String(v))}</p>`;
}

function metaRow(label: string, value: string): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Markdown-lite → HTML ──────────────────────────────────────────

function mdToHtml(input: string): string {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(" ").trim())}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const tag = list.type;
      out.push(`<${tag}>${list.items.map((it) => `<li>${inline(it)}</li>`).join("")}</${tag}>`);
      list = null;
    }
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      flushPara();
      flushList();
      continue;
    }
    let m: RegExpExecArray | null;
    if ((m = /^#\s+(.+)/.exec(trimmed))) { flushPara(); flushList(); out.push(`<h2>${inline(m[1])}</h2>`); continue; }
    if ((m = /^##\s+(.+)/.exec(trimmed))) { flushPara(); flushList(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
    if ((m = /^###\s+(.+)/.exec(trimmed))) { flushPara(); flushList(); out.push(`<h4>${inline(m[1])}</h4>`); continue; }
    if ((m = /^[-*•]\s+(.+)/.exec(trimmed))) {
      flushPara();
      if (!list || list.type !== "ul") { flushList(); list = { type: "ul", items: [] }; }
      list.items.push(m[1]);
      continue;
    }
    if ((m = /^(\d+)[.)]\s+(.+)/.exec(trimmed))) {
      flushPara();
      if (!list || list.type !== "ol") { flushList(); list = { type: "ol", items: [] }; }
      list.items.push(m[2]);
      continue;
    }
    if (/^---+$/.test(trimmed)) { flushPara(); flushList(); out.push(`<hr/>`); continue; }
    flushList();
    para.push(trimmed);
  }
  flushPara();
  flushList();
  return out.join("\n");
}

function inline(text: string): string {
  // Escape, then re-inject inline formatting tokens.
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, (_, c) => `<strong>${c}</strong>`);
  s = s.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, (_, pre, c) => `${pre}<em>${c}</em>`);
  return s;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
