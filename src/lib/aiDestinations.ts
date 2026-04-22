/**
 * AI → Product mapping layer.
 *
 * Bridges raw AI outputs (text, structured plan objects) into real product
 * objects (journal entries, adoption plan tasks, dog notes). Used by the
 * post-generation action bar so AI results never end up as preview-only.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Plain text destinations ─────────────────────────────────────

/**
 * Save an AI text output as a journal entry attached to a dog.
 * Stores the full text in `notes` and marks the entry as non-completed
 * (the user did not run a session, this is a documented insight).
 */
export async function saveAiTextToJournal(params: {
  dogId: string;
  userId: string;
  title: string;
  text: string;
}): Promise<void> {
  const header = `📌 ${params.title}\n\n`;
  const body = params.text.trim();
  const { error } = await supabase.from("journal_entries").insert({
    dog_id: params.dogId,
    user_id: params.userId,
    completed: false,
    notes: `${header}${body}`,
  });
  if (error) throw error;
}

// ─── Adoption plan destinations ──────────────────────────────────

export interface AiPlanTask {
  week_number: number;
  title: string;
  description?: string;
  task_type?: string;
  sort_order?: number;
}

export interface AiPlanShape {
  title?: string;
  description?: string;
  duration_weeks?: number;
  objectives?: string[];
  tasks?: AiPlanTask[];
}

/** Best-effort shape extraction from a generic content blob. */
export function extractPlanShape(content: unknown): AiPlanShape | null {
  if (!content || typeof content !== "object") return null;
  const o = content as Record<string, unknown>;
  // Some agents wrap plan under `plan` or `result`
  const candidate =
    (typeof o.plan === "object" && o.plan) ||
    (typeof o.result === "object" && o.result) ||
    o;
  const c = candidate as Record<string, unknown>;
  const tasks = Array.isArray(c.tasks) ? (c.tasks as AiPlanTask[]) : undefined;
  const objectives = Array.isArray(c.objectives)
    ? (c.objectives as unknown[]).map(String)
    : undefined;
  if (!tasks && !objectives && !c.duration_weeks && !c.title) return null;
  return {
    title: typeof c.title === "string" ? c.title : undefined,
    description: typeof c.description === "string" ? c.description : undefined,
    duration_weeks:
      typeof c.duration_weeks === "number" ? c.duration_weeks : undefined,
    objectives,
    tasks,
  };
}

/**
 * Persist an AI-generated adoption plan (plan row + tasks rows) atomically
 * from the shelter perspective. Returns the new plan id.
 */
export async function createAdoptionPlanFromAi(params: {
  shelterUserId: string;
  adopterUserId: string;
  animalId: string;
  plan: AiPlanShape;
  status?: "active" | "draft";
}): Promise<string> {
  const { data: planRow, error: planErr } = await supabase
    .from("adoption_plans")
    .insert({
      shelter_user_id: params.shelterUserId,
      adopter_user_id: params.adopterUserId,
      animal_id: params.animalId,
      title: params.plan.title || "Plan post-adoption (IA)",
      description: params.plan.description || "",
      duration_weeks: params.plan.duration_weeks ?? 8,
      objectives: params.plan.objectives ?? [],
      status: params.status ?? "active",
    })
    .select("id")
    .single();
  if (planErr) throw planErr;
  const planId = planRow.id as string;

  const tasks = params.plan.tasks ?? [];
  if (tasks.length > 0) {
    // Re-stamp sort_order per week to keep things stable.
    const perWeekCounter = new Map<number, number>();
    const rows = tasks.map((t) => {
      const week = Number(t.week_number ?? 1);
      const idx = perWeekCounter.get(week) ?? 0;
      perWeekCounter.set(week, idx + 1);
      return {
        plan_id: planId,
        week_number: week,
        title: t.title?.trim() || "Tâche",
        description: t.description ?? "",
        task_type: t.task_type ?? "observation",
        sort_order: t.sort_order ?? idx,
      };
    });
    const { error: taskErr } = await supabase
      .from("adoption_plan_tasks")
      .insert(rows);
    if (taskErr) throw taskErr;
  }

  return planId;
}
