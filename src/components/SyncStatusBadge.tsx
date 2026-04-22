import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { listEntries, subscribe, type OfflineEntry } from "@/lib/offlineQueue";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

interface SyncStatusBadgeProps {
  /** Compact mode: small chip suitable for headers / nav. */
  compact?: boolean;
  className?: string;
}

/**
 * Small visual indicator for the offline write queue.
 *
 * Three states:
 *  - online + empty queue → renders nothing (we don't pollute the UI).
 *  - online + non-empty queue → "Synchronisation…" while the runner drains.
 *  - offline → "Hors-ligne" plus the count of pending writes.
 *
 * Auto-refreshes from the queue subscription.
 */
export function SyncStatusBadge({ compact = false, className }: SyncStatusBadgeProps) {
  const online = useOnlineStatus();
  const [entries, setEntries] = useState<OfflineEntry[]>(() => listEntries());

  useEffect(() => {
    const unsub = subscribe(() => setEntries(listEntries()));
    return unsub;
  }, []);

  const count = entries.length;

  // Nothing to show when everything is in sync.
  if (online && count === 0) return null;

  const offlineMode = !online;
  const syncing = online && count > 0;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border text-[11px] font-medium select-none",
        compact ? "px-2 py-0.5" : "px-2.5 py-1",
        offlineMode
          ? "border-warning/40 bg-warning/10 text-warning"
          : "border-primary/40 bg-primary/10 text-primary",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {offlineMode ? (
        <>
          <CloudOff className="h-3 w-3" />
          {compact ? `${count}` : `Hors-ligne · ${count} en attente`}
        </>
      ) : syncing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          {compact ? `${count}` : `Synchronisation… ${count}`}
        </>
      ) : (
        <>
          <CheckCircle2 className="h-3 w-3" />
          {compact ? "" : "À jour"}
        </>
      )}
    </div>
  );
}
