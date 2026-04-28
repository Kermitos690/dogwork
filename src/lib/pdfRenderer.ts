// DogWork — Universal printable HTML renderer for AI exports.
//
// Goal: produce a beautiful, branded, emoji-safe, ultra-readable PDF
// directly from the browser print dialog. Supports both free-text
// (markdown-ish) and structured plan-like objects.
//
// v2 — Stronger semantic hierarchy:
//   • Section colors auto-detected from keywords (objectifs, vigilance,
//     conseils, récompense, étapes, exercices…)
//   • Automatic emoji prefix on H2/H3 when missing
//   • Callout cards for tips / warnings / steps
//   • Better lists, dividers, page-break safety

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

// ── Semantic palette per section type ──────────────────────────────
const SECTION_THEMES: Record<
  SectionType,
  { color: string; bg: string; border: string; emoji: string }
> = {
  objective: { color: "#9A3412", bg: "#FFF7ED", border: "#FED7AA", emoji: "🎯" },
  program:   { color: "#9A3412", bg: "#FFF7ED", border: "#FED7AA", emoji: "📋" },
  exercise:  { color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE", emoji: "🐾" },
  step:      { color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE", emoji: "✅" },
  warning:   { color: "#9F1239", bg: "#FFF1F2", border: "#FECDD3", emoji: "⚠️" },
  tip:       { color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", emoji: "💡" },
  reward:    { color: "#3F6212", bg: "#F7FEE7", border: "#D9F99D", emoji: "🦴" },
  context:   { color: "#5B21B6", bg: "#F5F3FF", border: "#DDD6FE", emoji: "🐕" },
  schedule:  { color: "#0E7490", bg: "#ECFEFF", border: "#A5F3FC", emoji: "📅" },
  evaluation:{ color: "#075985", bg: "#F0F9FF", border: "#BAE6FD", emoji: "📊" },
  default:   { color: "#1a1a2e", bg: "#fffdf9", border: RULE,     emoji: "📄" },
};

type SectionType =
  | "objective" | "program" | "exercise" | "step" | "warning"
  | "tip" | "reward" | "context" | "schedule" | "evaluation" | "default";

// Keyword → section type
const SECTION_KEYWORDS: Array<[RegExp, SectionType]> = [
  [/objectif|but|goal|finalit/i, "objective"],
  [/programme|plan|semaine|planning(?! &)|calendar/i, "program"],
  [/exercice|drill|atelier|s[ée]ance/i, "exercise"],
  [/[ée]tape|step|proc[ée]dure|m[ée]thode/i, "step"],
  [/vigilance|attention|danger|risque|alerte|warning|⚠/i, "warning"],
  [/conseil|astuce|tip|recommandation|bon[\s-]?[àa][\s-]?savoir/i, "tip"],
  [/r[ée]compense|reward|renforcement|reinforce/i, "reward"],
  [/contexte|chien|profil|context/i, "context"],
  [/horaire|fr[ée]quence|dur[ée]e|rendez-vous|schedule/i, "schedule"],
  [/[ée]valuation|score|bilan|progression|stat/i, "evaluation"],
];

function detectSection(title: string): SectionType {
  for (const [re, type] of SECTION_KEYWORDS) {
    if (re.test(title)) return type;
  }
  return "default";
}

function ensureEmoji(title: string, type: SectionType): string {
  // If the title already starts with an emoji or pictograph, keep it.
  // eslint-disable-next-line no-misleading-character-class
  const emojiRe = /^\p{Extended_Pictographic}/u;
  if (emojiRe.test(title.trim())) return title.trim();
  return `${SECTION_THEMES[type].emoji} ${title.trim()}`;
}

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
  .body p{margin:0 0 10px;color:#2a2d3a}
  .body ul,.body ol{margin:0 0 12px;padding-left:22px}
  .body li{margin:4px 0;color:#2a2d3a}
  .body strong{color:${INK};font-weight:700}
  .body em{color:#7a4a1a}
  .body code{background:${SOFT_BG};color:#C2410C;padding:1px 6px;border-radius:4px;font-size:12px;font-family:ui-monospace,Menlo,Consolas,monospace}
  .body hr{border:0;border-top:1px solid ${RULE};margin:18px 0}

  /* ── Section H2 with semantic ribbon ── */
  .body h2.sec{
    font-size:17px;font-weight:800;margin:24px 0 10px;letter-spacing:-.01em;
    padding:10px 14px;border-radius:10px;display:flex;align-items:center;gap:10px;
    border:1px solid;
  }
  .body h2.sec .ico{font-size:18px;line-height:1}
  .body h3{font-size:14.5px;font-weight:700;color:${INK};margin:18px 0 6px;display:flex;align-items:center;gap:8px}
  .body h3::before{content:"";width:6px;height:6px;border-radius:50%;background:#F97316;display:inline-block}
  .body h4{font-size:13px;font-weight:700;color:#C2410C;margin:14px 0 4px;text-transform:uppercase;letter-spacing:.04em}
  .body ul li::marker{color:#F97316}
  .body ol li::marker{color:#F97316;font-weight:700}

  /* ── Callouts ── */
  .callout{
    border:1px solid;border-radius:10px;padding:12px 14px;margin:12px 0;
    page-break-inside:avoid;break-inside:avoid;
    display:grid;grid-template-columns:24px 1fr;gap:10px;align-items:start;
  }
  .callout .ico{font-size:18px;line-height:1.2}
  .callout .ct{font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.04em;margin:0 0 4px}
  .callout p{margin:0;color:#2a2d3a}

  /* ── Cards & weeks ── */
  .card{border:1px solid ${RULE};border-radius:12px;padding:14px 16px;margin:12px 0;background:#fffdf9;page-break-inside:avoid;break-inside:avoid}
  .card .c-title{font-weight:700;color:${INK};margin:0 0 6px;display:flex;align-items:center;gap:8px}
  .card .c-title .dot{width:8px;height:8px;border-radius:50%;background:#F97316}

  .week{
    border:1px solid ${RULE};border-radius:12px;overflow:hidden;margin:12px 0 16px;background:#fff;
    page-break-inside:avoid;break-inside:avoid;
  }
  .week-head{
    background:${SOFT_BG};color:#9A3412;font-weight:700;font-size:13px;
    padding:9px 14px;border-bottom:1px solid ${RULE};display:flex;align-items:center;gap:8px;
  }
  .week-head .num{
    background:#F97316;color:#fff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;
  }
  .task{padding:10px 14px;border-top:1px solid #FAF1E2;display:grid;grid-template-columns:18px 1fr;gap:10px}
  .task:first-child{border-top:0}
  .task .check{color:#F97316;font-weight:800;line-height:1.5}
  .task .t-title{font-weight:600;color:${INK};margin:0 0 2px}
  .task .t-desc{font-size:12.5px;color:${MUTED};margin:0}

  .meta-grid{
    display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;
    border:1px solid ${RULE};border-radius:10px;padding:12px 14px;background:#fffdf9;margin:12px 0;
  }
  .meta-grid div{display:flex;justify-content:space-between;font-size:12.5px;gap:12px}
  .meta-grid dt{color:${MUTED}}
  .meta-grid dd{margin:0;font-weight:700;color:${INK};text-align:right}

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
    h1.doc-title,.body h2.sec,.body h3{break-after:avoid;page-break-after:avoid}
    .week,.card,.callout{break-inside:avoid;page-break-inside:avoid}
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
  const fire = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* noop */
    }
  };
  const img = win.document.querySelector("img");
  if (img && !(img as HTMLImageElement).complete) {
    img.addEventListener("load", () => setTimeout(fire, 200));
    setTimeout(fire, 1500);
  } else {
    setTimeout(fire, 300);
  }
  return true;
}

// ─── Helpers — colored sections ────────────────────────────────────

function sectionH2(rawTitle: string): string {
  const type = detectSection(rawTitle);
  const theme = SECTION_THEMES[type];
  const titled = ensureEmoji(rawTitle, type);
  // Strip leading emoji into its own span if present
  // eslint-disable-next-line no-misleading-character-class
  const m = /^(\p{Extended_Pictographic}[\uFE0F]?)\s*(.*)$/u.exec(titled);
  const ico = m ? m[1] : theme.emoji;
  const rest = m ? m[2] : titled;
  return `<h2 class="sec" style="background:${theme.bg};border-color:${theme.border};color:${theme.color}"><span class="ico">${ico}</span><span>${escapeHtml(rest)}</span></h2>`;
}

function callout(type: SectionType, title: string, body: string): string {
  const t = SECTION_THEMES[type];
  return `<div class="callout" style="background:${t.bg};border-color:${t.border};color:${t.color}">
    <div class="ico">${t.emoji}</div>
    <div><p class="ct">${escapeHtml(title)}</p>${body}</div>
  </div>`;
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

  // Executive summary card
  const meta: string[] = [];
  if (typeof plan.dog_name === "string") meta.push(metaRow("🐕 Chien", plan.dog_name));
  if (typeof plan.level === "string") meta.push(metaRow("📊 Niveau", plan.level));
  if (duration != null) meta.push(metaRow("⏱ Durée", `${duration} semaine${duration > 1 ? "s" : ""}`));
  if (typeof plan.frequency === "string") meta.push(metaRow("📅 Fréquence", plan.frequency));
  if (typeof plan.session_minutes === "number") meta.push(metaRow("⌛ Par séance", `${plan.session_minutes} min`));
  if (meta.length) parts.push(`<dl class="meta-grid">${meta.join("")}</dl>`);

  if (description) {
    parts.push(callout("tip", "À retenir", `<p>${escapeHtml(description)}</p>`));
  }

  if (objectives.length) {
    parts.push(sectionH2("Objectifs"));
    parts.push(`<ul>${objectives.map((o) => `<li>${escapeHtml(String(o))}</li>`).join("")}</ul>`);
  }

  if (tasks.length) {
    const byWeek = new Map<number, Array<Record<string, unknown>>>();
    for (const t of tasks) {
      const w = Number(t.week_number ?? t.week ?? 0);
      if (!byWeek.has(w)) byWeek.set(w, []);
      byWeek.get(w)!.push(t);
    }
    const weeks = Array.from(byWeek.keys()).sort((a, b) => a - b);
    parts.push(sectionH2("Programme"));
    for (const w of weeks) {
      const label = w === 0 ? "À tout moment" : `Semaine ${w}`;
      const items = byWeek
        .get(w)!
        .map((t) => {
          const ti = escapeHtml(String(t.title ?? "Tâche"));
          const de = t.description ? `<p class="t-desc">${escapeHtml(String(t.description))}</p>` : "";
          return `<div class="task"><div class="check">✓</div><div><p class="t-title">${ti}</p>${de}</div></div>`;
        })
        .join("");
      parts.push(`<div class="week"><div class="week-head"><span class="num">${w || "★"}</span>${escapeHtml(label)}</div>${items}</div>`);
    }
  }

  // Optional vigilance / tips arrays the plan may contain
  if (Array.isArray(plan.warnings) && plan.warnings.length) {
    parts.push(callout("warning", "Vigilance", `<ul>${plan.warnings.map((w) => `<li>${escapeHtml(String(w))}</li>`).join("")}</ul>`));
  }
  if (Array.isArray(plan.tips) && plan.tips.length) {
    parts.push(callout("tip", "Conseils du coach", `<ul>${plan.tips.map((w) => `<li>${escapeHtml(String(w))}</li>`).join("")}</ul>`));
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
  return `${sectionH2("Contexte du chien")}<dl class="meta-grid">${rows.join("")}</dl>`;
}

function renderStructured(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj).filter(([, v]) => v != null && v !== "");
  if (!entries.length) return `<p><em>Document vide.</em></p>`;
  return entries
    .map(([k, v]) => `${sectionH2(humanize(k))}${renderValue(v)}`)
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
    if ((m = /^#\s+(.+)/.exec(trimmed))) { flushPara(); flushList(); out.push(sectionH2(stripMd(m[1]))); continue; }
    if ((m = /^##\s+(.+)/.exec(trimmed))) { flushPara(); flushList(); out.push(sectionH2(stripMd(m[1]))); continue; }
    if ((m = /^###\s+(.+)/.exec(trimmed))) { flushPara(); flushList(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
    if ((m = /^####\s+(.+)/.exec(trimmed))) { flushPara(); flushList(); out.push(`<h4>${inline(m[1])}</h4>`); continue; }
    // Callout shortcuts: > !warning text  > !tip text
    if ((m = /^>\s*!(warning|tip|reward|step)\s+(.+)/i.exec(trimmed))) {
      flushPara(); flushList();
      const t = m[1].toLowerCase() as SectionType;
      const labels: Record<string, string> = { warning: "Vigilance", tip: "Conseil", reward: "Récompense", step: "Étape" };
      out.push(callout(t, labels[t] ?? "Note", `<p>${inline(m[2])}</p>`));
      continue;
    }
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

function stripMd(s: string): string {
  return s.replace(/[*_`]/g, "").trim();
}

function inline(text: string): string {
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
