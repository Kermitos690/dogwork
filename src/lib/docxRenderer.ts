/**
 * DogWork — DOCX renderer for AI-generated documents.
 *
 * Produces structured, branded Word documents with:
 *   • DogWork branding header (orange gradient)
 *   • Semantic section headings (Objectifs, Exercices, Vigilance…)
 *   • Proper lists, tables, callouts
 *   • Left-aligned body text (never justified)
 *   • Footer with branding
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, LevelFormat, PageBreak,
} from "docx";
import { saveAs } from "file-saver";

// ── Types ──────────────────────────────────────────────────────────

interface BuildOptions {
  title: string;
  summary?: string | null;
  content: unknown;
  contextLabel?: string;
}

type SectionType =
  | "objective" | "program" | "exercise" | "step" | "warning"
  | "tip" | "reward" | "context" | "schedule" | "evaluation" | "default";

// ── Section detection ──────────────────────────────────────────────

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

const SECTION_COLORS: Record<SectionType, { color: string; bg: string; emoji: string }> = {
  objective:  { color: "9A3412", bg: "FFF7ED", emoji: "🎯" },
  program:    { color: "9A3412", bg: "FFF7ED", emoji: "📋" },
  exercise:   { color: "1E40AF", bg: "EFF6FF", emoji: "🐾" },
  step:       { color: "1E40AF", bg: "EFF6FF", emoji: "✅" },
  warning:    { color: "9F1239", bg: "FFF1F2", emoji: "⚠️" },
  tip:        { color: "92400E", bg: "FFFBEB", emoji: "💡" },
  reward:     { color: "3F6212", bg: "F7FEE7", emoji: "🦴" },
  context:    { color: "5B21B6", bg: "F5F3FF", emoji: "🐕" },
  schedule:   { color: "0E7490", bg: "ECFEFF", emoji: "📅" },
  evaluation: { color: "075985", bg: "F0F9FF", emoji: "📊" },
  default:    { color: "1a1a2e", bg: "FFFDF9", emoji: "📄" },
};

function detectSection(title: string): SectionType {
  for (const [re, type] of SECTION_KEYWORDS) {
    if (re.test(title)) return type;
  }
  return "default";
}

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Paragraph builders ─────────────────────────────────────────────

const FONT = "Segoe UI";
const BODY_SIZE = 22; // 11pt in half-points

function heading2(rawTitle: string): Paragraph {
  const type = detectSection(rawTitle);
  const theme = SECTION_COLORS[type];
  const clean = rawTitle.replace(/^#+\s*/, "").trim();
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160 },
    shading: { fill: theme.bg, type: ShadingType.CLEAR, color: "auto" },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: theme.color, space: 4 },
    },
    children: [
      new TextRun({
        text: `${theme.emoji}  ${clean}`,
        bold: true,
        size: 28,
        color: theme.color,
        font: FONT,
      }),
    ],
  });
}

function heading3(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({ text: title, bold: true, size: 24, color: "1a1a2e", font: FONT }),
    ],
  });
}

function bodyParagraph(text: string): Paragraph {
  // Parse basic markdown bold/italic
  const runs = parseInlineMarkdown(text);
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 120 },
    children: runs,
  });
}

function parseInlineMarkdown(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|[^*`]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const seg = match[1];
    if (seg.startsWith("**") && seg.endsWith("**")) {
      runs.push(new TextRun({ text: seg.slice(2, -2), bold: true, size: BODY_SIZE, font: FONT }));
    } else if (seg.startsWith("*") && seg.endsWith("*")) {
      runs.push(new TextRun({ text: seg.slice(1, -1), italics: true, size: BODY_SIZE, font: FONT }));
    } else if (seg.startsWith("`") && seg.endsWith("`")) {
      runs.push(new TextRun({ text: seg.slice(1, -1), size: BODY_SIZE, font: "Consolas", color: "C2410C" }));
    } else {
      runs.push(new TextRun({ text: seg, size: BODY_SIZE, font: FONT }));
    }
  }
  return runs.length ? runs : [new TextRun({ text, size: BODY_SIZE, font: FONT })];
}

// ── Content converters ─────────────────────────────────────────────

function convertContent(content: unknown): Paragraph[] {
  if (content == null) return [bodyParagraph("Aucun contenu.")];
  if (typeof content === "string") return convertMarkdown(content);
  if (typeof content !== "object") return [bodyParagraph(String(content))];

  const obj = content as Record<string, unknown>;

  // agent-runner shape
  if (typeof obj.text === "string" && obj.text.trim()) {
    const paras = convertMarkdown(obj.text);
    paras.push(...convertDogContext(obj));
    return paras;
  }

  // plan-like
  if ("tasks" in obj || "objectives" in obj || "duration_weeks" in obj || "days" in obj) {
    return convertPlan(obj);
  }

  return convertStructured(obj);
}

function convertPlan(plan: Record<string, unknown>): Paragraph[] {
  const paras: Paragraph[] = [];

  // Meta table
  const metaRows: [string, string][] = [];
  if (typeof plan.dog_name === "string") metaRows.push(["🐕 Chien", plan.dog_name]);
  if (typeof plan.level === "string") metaRows.push(["📊 Niveau", plan.level]);
  if (plan.duration_weeks != null) metaRows.push(["⏱ Durée", `${plan.duration_weeks} semaine(s)`]);
  if (typeof plan.frequency === "string") metaRows.push(["📅 Fréquence", plan.frequency]);
  if (typeof plan.session_minutes === "number") metaRows.push(["⌛ Par séance", `${plan.session_minutes} min`]);

  if (metaRows.length) {
    paras.push(...buildMetaTable(metaRows));
    paras.push(new Paragraph({ spacing: { after: 120 } }));
  }

  if (typeof plan.description === "string" && plan.description) {
    paras.push(...buildCallout("tip", "À retenir", plan.description));
  }

  const objectives = Array.isArray(plan.objectives) ? plan.objectives : [];
  if (objectives.length) {
    paras.push(heading2("Objectifs"));
    for (const o of objectives) {
      paras.push(bulletItem(String(o)));
    }
  }

  const tasks = Array.isArray(plan.tasks) ? (plan.tasks as Array<Record<string, unknown>>) : [];
  if (tasks.length) {
    paras.push(heading2("Programme"));
    const byWeek = new Map<number, Array<Record<string, unknown>>>();
    for (const t of tasks) {
      const w = Number(t.week_number ?? t.week ?? 0);
      if (!byWeek.has(w)) byWeek.set(w, []);
      byWeek.get(w)!.push(t);
    }
    for (const [w, items] of Array.from(byWeek.entries()).sort(([a], [b]) => a - b)) {
      const label = w === 0 ? "À tout moment" : `Semaine ${w}`;
      paras.push(heading3(label));
      for (const t of items) {
        const title = String(t.title ?? "Tâche");
        const desc = t.description ? String(t.description) : "";
        paras.push(new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: "✓  ", bold: true, color: "F97316", size: BODY_SIZE, font: FONT }),
            new TextRun({ text: title, bold: true, size: BODY_SIZE, font: FONT }),
            ...(desc ? [new TextRun({ text: `  —  ${desc}`, size: 20, color: "5b6170", font: FONT })] : []),
          ],
        }));
      }
    }
  }

  if (Array.isArray(plan.warnings) && plan.warnings.length) {
    paras.push(...buildCallout("warning", "Vigilance", plan.warnings.map(String).join("\n• ")));
  }
  if (Array.isArray(plan.tips) && plan.tips.length) {
    paras.push(...buildCallout("tip", "Conseils", plan.tips.map(String).join("\n• ")));
  }

  return paras;
}

function convertDogContext(obj: Record<string, unknown>): Paragraph[] {
  const dp = obj.dog_profile as Record<string, unknown> | undefined;
  if (!dp || typeof dp !== "object") return [];
  const rows: [string, string][] = [];
  if (dp.name) rows.push(["🐕 Chien", String(dp.name)]);
  if (dp.breed) rows.push(["🧬 Race", String(dp.breed)]);
  if (dp.age_years != null) rows.push(["🎂 Âge", `${dp.age_years} an(s)`]);
  if (dp.threshold_distance_m != null) rows.push(["📏 Distance de confort", `${dp.threshold_distance_m} m`]);
  if (!rows.length) return [];
  return [heading2("Contexte du chien"), ...buildMetaTable(rows)];
}

function convertStructured(obj: Record<string, unknown>): Paragraph[] {
  const entries = Object.entries(obj).filter(([, v]) => v != null && v !== "");
  if (!entries.length) return [bodyParagraph("Document vide.")];
  const paras: Paragraph[] = [];
  for (const [k, v] of entries) {
    paras.push(heading2(humanize(k)));
    paras.push(...convertValue(v));
  }
  return paras;
}

function convertValue(v: unknown): Paragraph[] {
  if (v == null) return [bodyParagraph("—")];
  if (typeof v === "string") return convertMarkdown(v);
  if (typeof v === "number" || typeof v === "boolean") return [bodyParagraph(String(v))];
  if (Array.isArray(v)) {
    if (!v.length) return [bodyParagraph("—")];
    return v.map((it) => {
      if (typeof it === "string" || typeof it === "number") return bulletItem(String(it));
      if (typeof it === "object" && it && "title" in (it as object))
        return bulletItem(String((it as Record<string, unknown>).title));
      return bulletItem(JSON.stringify(it));
    });
  }
  if (typeof v === "object") return convertStructured(v as Record<string, unknown>);
  return [bodyParagraph(String(v))];
}

function convertMarkdown(input: string): Paragraph[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const paras: Paragraph[] = [];
  let currentPara: string[] = [];

  const flushPara = () => {
    if (currentPara.length) {
      paras.push(bodyParagraph(currentPara.join(" ").trim()));
      currentPara = [];
    }
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) { flushPara(); continue; }

    let m: RegExpExecArray | null;
    if ((m = /^#{1,2}\s+(.+)/.exec(trimmed))) {
      flushPara();
      paras.push(heading2(m[1].replace(/[*_`]/g, "").trim()));
      continue;
    }
    if ((m = /^###\s+(.+)/.exec(trimmed))) {
      flushPara();
      paras.push(heading3(m[1].trim()));
      continue;
    }
    if ((m = /^[-*•]\s+(.+)/.exec(trimmed))) {
      flushPara();
      paras.push(bulletItem(m[1]));
      continue;
    }
    if ((m = /^(\d+)[.)]\s+(.+)/.exec(trimmed))) {
      flushPara();
      paras.push(numberedItem(m[2]));
      continue;
    }
    if (/^---+$/.test(trimmed)) {
      flushPara();
      paras.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: "F1E5D6", space: 6 } },
        spacing: { after: 200 },
      }));
      continue;
    }
    currentPara.push(trimmed);
  }
  flushPara();
  return paras;
}

// ── Helpers ────────────────────────────────────────────────────────

function bulletItem(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 60 },
    indent: { left: 360, hanging: 360 },
    children: [
      new TextRun({ text: "•  ", color: "F97316", bold: true, size: BODY_SIZE, font: FONT }),
      ...parseInlineMarkdown(text),
    ],
  });
}

function numberedItem(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 60 },
    indent: { left: 360, hanging: 360 },
    children: parseInlineMarkdown(text),
  });
}

function buildCallout(type: SectionType, title: string, body: string): Paragraph[] {
  const theme = SECTION_COLORS[type];
  const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: theme.color };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
  return [
    new Paragraph({
      spacing: { before: 160, after: 80 },
      shading: { fill: theme.bg, type: ShadingType.CLEAR, color: "auto" },
      border: {
        left: { style: BorderStyle.SINGLE, size: 12, color: theme.color, space: 8 },
      },
      indent: { left: 200 },
      children: [
        new TextRun({ text: `${theme.emoji}  ${title}`, bold: true, size: 22, color: theme.color, font: FONT }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160 },
      shading: { fill: theme.bg, type: ShadingType.CLEAR, color: "auto" },
      border: {
        left: { style: BorderStyle.SINGLE, size: 12, color: theme.color, space: 8 },
      },
      indent: { left: 200 },
      children: parseInlineMarkdown(body),
    }),
  ];
}

function buildMetaTable(rows: [string, string][]): Paragraph[] {
  const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "F1E5D6" };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
  const margins = { top: 60, bottom: 60, left: 120, right: 120 };

  const tableRows = rows.map(([label, value]) =>
    new TableRow({
      children: [
        new TableCell({
          borders,
          margins,
          width: { size: 3500, type: WidthType.DXA },
          shading: { fill: "FFF7ED", type: ShadingType.CLEAR, color: "auto" },
          children: [new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: label, size: 20, color: "5b6170", font: FONT })],
          })],
        }),
        new TableCell({
          borders,
          margins,
          width: { size: 5860, type: WidthType.DXA },
          children: [new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: value, bold: true, size: 22, color: "1a1a2e", font: FONT })],
          })],
        }),
      ],
    })
  );

  return [new Paragraph({ children: [] }), // spacer
    ...tableRows.length ? [new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [3500, 5860],
      rows: tableRows,
    }) as unknown as Paragraph] : [],
  ];
}

// ── Main document builder ──────────────────────────────────────────

function buildDocxDocument(opts: BuildOptions): Document {
  const { title, summary, content, contextLabel } = opts;
  const dateStr = new Date().toLocaleDateString("fr-CH", {
    day: "numeric", month: "long", year: "numeric",
  });

  const children: (Paragraph | Table)[] = [];

  // Title block
  if (contextLabel) {
    children.push(new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({
        text: contextLabel.toUpperCase(),
        size: 18, bold: true, color: "C2410C", font: FONT,
      })],
    }));
  }

  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 120 },
    children: [new TextRun({
      text: title || "Document DogWork",
      bold: true, size: 44, color: "1a1a2e", font: FONT,
    })],
  }));

  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({
      text: `Généré le ${dateStr}`,
      size: 18, color: "5b6170", font: FONT,
    })],
  }));

  if (summary) {
    children.push(new Paragraph({
      spacing: { before: 80, after: 200 },
      border: {
        left: { style: BorderStyle.SINGLE, size: 8, color: "F97316", space: 8 },
      },
      indent: { left: 200 },
      children: [new TextRun({
        text: summary,
        italics: true, size: 22, color: "5b6170", font: FONT,
      })],
    }));
  }

  // Separator
  children.push(new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: "F1E5D6", space: 8 } },
    spacing: { after: 240 },
  }));

  // Content
  children.push(...convertContent(content) as Paragraph[]);

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: BODY_SIZE },
          paragraph: { alignment: AlignmentType.LEFT },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 44, bold: true, font: FONT, color: "1a1a2e" },
          paragraph: { spacing: { before: 240, after: 200 } },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: FONT },
          paragraph: { spacing: { before: 360, after: 160 } },
        },
        {
          id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, font: FONT, color: "1a1a2e" },
          paragraph: { spacing: { before: 240, after: 100 } },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }, // ~2cm
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.LEFT,
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "F97316", space: 4 },
            },
            children: [
              new TextRun({ text: "DogWork", bold: true, size: 20, color: "F97316", font: FONT }),
              new TextRun({ text: "  ·  L'éducation canine intelligente", size: 16, color: "5b6170", font: FONT }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Généré par DogWork · dogwork-at-home.com · Ce document est personnel.", size: 16, color: "5b6170", font: FONT }),
            ],
          })],
        }),
      },
      children: children as Paragraph[],
    }],
  });
}

// ── Public API ─────────────────────────────────────────────────────

export async function downloadDocx(opts: BuildOptions): Promise<boolean> {
  try {
    const doc = buildDocxDocument(opts);
    const blob = await Packer.toBlob(doc);
    const safeName = (opts.title || "document-dogwork")
      .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 60);
    saveAs(blob, `${safeName}.docx`);
    return true;
  } catch (err) {
    console.error("[docxRenderer] Export failed:", err);
    return false;
  }
}
