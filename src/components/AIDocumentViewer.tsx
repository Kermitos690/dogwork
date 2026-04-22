import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface AIDocumentViewerProps {
  /** Either a structured object (plan, report, etc.) or a free-text generation. */
  content: unknown;
  /** Optional title rendered as the H1 of the document. */
  title?: string;
  /** Optional one-line summary rendered above the body. */
  summary?: string | null;
  /** When true, applies a constrained max-width for printable readability. */
  printable?: boolean;
  className?: string;
}

/**
 * Premium structured renderer for any AI output.
 *
 * - Detects free-text in `content.text` (saved by agent-runner) and renders
 *   a lightweight markdown-style view (headings, lists, paragraphs).
 * - Detects structured plan-like objects (title, description, objectives,
 *   duration_weeks, tasks, days, steps...) and renders proper sections.
 * - Falls back to a clean key/value rendering when shape is unknown,
 *   never the raw JSON dump.
 */
export function AIDocumentViewer({
  content,
  title,
  summary,
  printable = false,
  className,
}: AIDocumentViewerProps) {
  const node = useMemo(() => extractRenderable(content), [content]);

  return (
    <article
      className={cn(
        "ai-doc text-foreground",
        printable ? "max-w-[720px] mx-auto" : "max-w-none",
        className,
      )}
    >
      {title && (
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          {title}
        </h1>
      )}
      {summary && (
        <p className="text-sm text-muted-foreground italic border-l-2 border-primary/40 pl-3 mb-5">
          {summary}
        </p>
      )}
      {node}
    </article>
  );
}

// ─── Renderers ────────────────────────────────────────────────────

function extractRenderable(content: unknown): JSX.Element {
  if (content == null) return <EmptyState />;

  // String content → markdown-ish text
  if (typeof content === "string") {
    return <MarkdownText text={content} />;
  }

  if (typeof content !== "object") {
    return <p className="text-sm">{String(content)}</p>;
  }

  const obj = content as Record<string, unknown>;

  // agent-runner shape: { text, context_summary, dog_profile, params, ... }
  if (typeof obj.text === "string" && obj.text.trim().length > 0) {
    return (
      <>
        <MarkdownText text={obj.text as string} />
        {renderContextExtras(obj)}
      </>
    );
  }

  // Plan-like shape (adoption / training plan)
  if (looksLikePlan(obj)) {
    return <PlanView plan={obj} />;
  }

  // Generic structured fallback
  return <StructuredView data={obj} />;
}

function looksLikePlan(obj: Record<string, unknown>): boolean {
  return (
    "tasks" in obj ||
    "objectives" in obj ||
    "duration_weeks" in obj ||
    "days" in obj ||
    "weeks" in obj
  );
}

function renderContextExtras(obj: Record<string, unknown>) {
  const dogProfile = obj.dog_profile as Record<string, unknown> | null | undefined;
  if (!dogProfile || typeof dogProfile !== "object") return null;

  const items: Array<{ label: string; value: string }> = [];
  if (dogProfile.name) items.push({ label: "Chien", value: String(dogProfile.name) });
  if (dogProfile.breed) items.push({ label: "Race", value: String(dogProfile.breed) });
  if (dogProfile.age_years != null) items.push({ label: "Âge", value: `${dogProfile.age_years} an(s)` });
  if (dogProfile.threshold_distance_m != null)
    items.push({ label: "Distance de confort", value: `${dogProfile.threshold_distance_m} m` });

  if (items.length === 0) return null;

  return (
    <div className="mt-6 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Contexte du chien utilisé
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {items.map((it) => (
          <div key={it.label} className="flex justify-between">
            <dt className="text-muted-foreground">{it.label}</dt>
            <dd className="font-medium">{it.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PlanView({ plan }: { plan: Record<string, unknown> }) {
  const title = (plan.title as string) || undefined;
  const description = (plan.description as string) || undefined;
  const duration = plan.duration_weeks as number | undefined;
  const objectives = Array.isArray(plan.objectives) ? (plan.objectives as unknown[]) : [];
  const tasks = Array.isArray(plan.tasks) ? (plan.tasks as Array<Record<string, unknown>>) : [];

  // Group tasks by week if available
  const tasksByWeek = new Map<number, Array<Record<string, unknown>>>();
  for (const t of tasks) {
    const w = Number(t.week_number ?? t.week ?? 0);
    if (!tasksByWeek.has(w)) tasksByWeek.set(w, []);
    tasksByWeek.get(w)!.push(t);
  }
  const weeks = Array.from(tasksByWeek.keys()).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {title && <h2 className="text-xl font-semibold">{title}</h2>}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      {(duration || objectives.length > 0) && (
        <section className="rounded-lg border border-border bg-card p-4 space-y-3">
          {duration != null && (
            <p className="text-sm">
              <span className="font-medium">Durée :</span>{" "}
              {duration} semaine{duration > 1 ? "s" : ""}
            </p>
          )}
          {objectives.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Objectifs</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm marker:text-primary">
                {objectives.map((o, i) => (
                  <li key={i}>{String(o)}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {weeks.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Programme
          </h3>
          <div className="space-y-4">
            {weeks.map((w) => (
              <div key={w} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="bg-muted/40 px-4 py-2 border-b border-border">
                  <p className="text-sm font-semibold">
                    {w === 0 ? "À tout moment" : `Semaine ${w}`}
                  </p>
                </div>
                <ol className="divide-y divide-border">
                  {tasksByWeek.get(w)!.map((t, idx) => (
                    <li key={idx} className="px-4 py-3">
                      <p className="font-medium text-sm">
                        {(t.title as string) || `Tâche ${idx + 1}`}
                      </p>
                      {t.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {String(t.description)}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StructuredView({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([_, v]) => v != null && v !== "");
  if (entries.length === 0) return <EmptyState />;

  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => (
        <section key={key}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            {humanize(key)}
          </h3>
          <ValueRenderer value={value} />
        </section>
      ))}
    </div>
  );
}

function ValueRenderer({ value }: { value: unknown }) {
  if (value == null) return <p className="text-sm text-muted-foreground">—</p>;
  if (typeof value === "string") return <MarkdownText text={value} compact />;
  if (typeof value === "number" || typeof value === "boolean")
    return <p className="text-sm">{String(value)}</p>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="text-sm text-muted-foreground">—</p>;
    return (
      <ul className="list-disc pl-5 space-y-1 text-sm marker:text-primary">
        {value.map((item, i) => (
          <li key={i}>
            {typeof item === "string" || typeof item === "number"
              ? String(item)
              : typeof item === "object" && item != null && "title" in (item as object)
              ? String((item as Record<string, unknown>).title)
              : JSON.stringify(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") return <StructuredView data={value as Record<string, unknown>} />;
  return <p className="text-sm">{String(value)}</p>;
}

// ─── Markdown-lite text renderer ──────────────────────────────────

function MarkdownText({ text, compact = false }: { text: string; compact?: boolean }) {
  const blocks = parseMarkdown(text);
  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h1":
            return (
              <h2 key={i} className="text-xl font-bold mt-4 first:mt-0">
                {b.text}
              </h2>
            );
          case "h2":
            return (
              <h3 key={i} className="text-lg font-semibold mt-3 first:mt-0">
                {b.text}
              </h3>
            );
          case "h3":
            return (
              <h4 key={i} className="text-base font-semibold mt-2 first:mt-0 text-foreground">
                {b.text}
              </h4>
            );
          case "ul":
            return (
              <ul key={i} className="list-disc pl-5 space-y-1 text-sm marker:text-primary">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-decimal pl-5 space-y-1 text-sm marker:text-primary">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ol>
            );
          case "p":
          default:
            return (
              <p key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
                {renderInline(b.text)}
              </p>
            );
        }
      })}
    </div>
  );
}

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "p"; text: string };

function parseMarkdown(input: string): Block[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "p", text: para.join("\n").trim() });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw;
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      flushList();
      continue;
    }

    const h1 = /^#\s+(.+)/.exec(trimmed);
    const h2 = /^##\s+(.+)/.exec(trimmed);
    const h3 = /^###\s+(.+)/.exec(trimmed);
    if (h3) {
      flushPara();
      flushList();
      blocks.push({ type: "h3", text: h3[1] });
      continue;
    }
    if (h2) {
      flushPara();
      flushList();
      blocks.push({ type: "h2", text: h2[1] });
      continue;
    }
    if (h1) {
      flushPara();
      flushList();
      blocks.push({ type: "h1", text: h1[1] });
      continue;
    }

    const ul = /^[-*•]\s+(.+)/.exec(trimmed);
    const ol = /^(\d+)[.)]\s+(.+)/.exec(trimmed);
    if (ul) {
      flushPara();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(ul[1]);
      continue;
    }
    if (ol) {
      flushPara();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(ol[2]);
      continue;
    }

    flushList();
    para.push(trimmed);
  }

  flushPara();
  flushList();
  return blocks;
}

function renderInline(text: string): JSX.Element {
  // Bold **text** and italic *text*
  const parts: Array<JSX.Element | string> = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2] != null) parts.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[3] != null) parts.push(<em key={key++}>{match[3]}</em>);
    else if (match[4] != null)
      parts.push(
        <code key={key++} className="px-1 py-0.5 rounded bg-muted text-xs">
          {match[4]}
        </code>,
      );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function EmptyState() {
  return <p className="text-sm text-muted-foreground italic">Aucun contenu disponible.</p>;
}
