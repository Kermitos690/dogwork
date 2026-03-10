import type { DayStatus } from "@/types";

const config: Record<DayStatus, { label: string; className: string }> = {
  todo: { label: "À faire", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "En cours", className: "bg-warning/15 text-warning" },
  done: { label: "Validé", className: "bg-success/15 text-success" },
};

export function StatusBadge({ status }: { status: DayStatus }) {
  const c = config[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}
