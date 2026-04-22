/**
 * Behavioral threshold zone system.
 *
 * Three zones describe the dog's training receptivity:
 *  - green:  calm, receptive, trainable
 *  - orange: rising tension, caution, near threshold
 *  - red:    over-threshold, training quality degraded, disengage
 *
 * Mapping from tension_level (1-10 scale used across behavior_logs and journal):
 *  - 1-2 → green
 *  - 3-4 → orange
 *  - 5+  → red
 *
 * The mapping mirrors the SQL function `public.derive_behavior_zone(int)` so
 * client-side display stays consistent with server-side trigger auto-fill.
 */

export type Zone = "green" | "orange" | "red";

export const ZONE_THRESHOLDS = {
  greenMax: 2,
  orangeMax: 4,
  // 5+ → red
} as const;

export function zoneFromTension(tension: number | null | undefined): Zone | null {
  if (tension == null || tension <= 0) return null;
  if (tension <= ZONE_THRESHOLDS.greenMax) return "green";
  if (tension <= ZONE_THRESHOLDS.orangeMax) return "orange";
  return "red";
}

export const ZONE_META: Record<
  Zone,
  { label: string; short: string; emoji: string; description: string }
> = {
  green: {
    label: "Zone verte",
    short: "Vert",
    emoji: "🟢",
    description: "Calme, réceptif, prêt à apprendre",
  },
  orange: {
    label: "Zone orange",
    short: "Orange",
    emoji: "🟠",
    description: "Tension qui monte, vigilance, proche du seuil",
  },
  red: {
    label: "Zone rouge",
    short: "Rouge",
    emoji: "🔴",
    description: "Au-delà du seuil — désengager, faire baisser la pression",
  },
};

/**
 * Tailwind class helpers (semantic tokens — no raw hex).
 * Border + background + text trio for consistent badges across the app.
 */
export const ZONE_CLASSES: Record<Zone, string> = {
  green: "border-success/40 bg-success/15 text-success",
  orange: "border-warning/40 bg-warning/15 text-warning",
  red: "border-destructive/40 bg-destructive/15 text-destructive",
};

export const ZONE_DOT_CLASSES: Record<Zone, string> = {
  green: "bg-success",
  orange: "bg-warning",
  red: "bg-destructive",
};
