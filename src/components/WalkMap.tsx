import { useMemo } from "react";

export interface WalkMapPoint { lat: number; lng: number; t: number; }
export interface WalkMapEvent { type: string; label: string; lat?: number; lng?: number; t: number; }

interface Props {
  points: WalkMapPoint[];
  events?: WalkMapEvent[];
  height?: number;
  className?: string;
}

/**
 * Carte légère SVG du tracé GPS, sans dépendance externe.
 * Affiche un polyline + marqueurs début/fin + événements.
 * Tombe en silencieusement vide si aucun point — le parent affichera un fallback.
 */
export function WalkMap({ points, events = [], height = 220, className }: Props) {
  const data = useMemo(() => {
    if (points.length === 0) return null;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    let minLat = Math.min(...lats), maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    // padding pour éviter division par zéro et donner de l'air
    const padLat = Math.max((maxLat - minLat) * 0.15, 0.0005);
    const padLng = Math.max((maxLng - minLng) * 0.15, 0.0005);
    minLat -= padLat; maxLat += padLat; minLng -= padLng; maxLng += padLng;

    const w = 600, h = height;
    const project = (lat: number, lng: number) => {
      const x = ((lng - minLng) / (maxLng - minLng)) * w;
      const y = h - ((lat - minLat) / (maxLat - minLat)) * h;
      return { x, y };
    };
    const projected = points.map((p) => project(p.lat, p.lng));
    const path = projected.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const evMarkers = events
      .filter((e) => typeof e.lat === "number" && typeof e.lng === "number")
      .map((e) => ({ ...project(e.lat!, e.lng!), label: e.label, type: e.type }));
    return { w, h, path, projected, evMarkers };
  }, [points, events, height]);

  if (!data) return null;
  const start = data.projected[0];
  const end = data.projected[data.projected.length - 1];

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${data.w} ${data.h}`}
        preserveAspectRatio="none"
        className="w-full rounded-lg border bg-muted/30"
        style={{ height }}
        role="img"
        aria-label="Tracé de la promenade"
      >
        <defs>
          <pattern id="walkmap-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={data.w} height={data.h} fill="url(#walkmap-grid)" className="text-foreground" />
        <path
          d={data.path}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {start && (
          <circle cx={start.x} cy={start.y} r="6" fill="hsl(var(--primary))" stroke="white" strokeWidth="2" />
        )}
        {end && data.projected.length > 1 && (
          <circle cx={end.x} cy={end.y} r="7" fill="hsl(var(--destructive))" stroke="white" strokeWidth="2" />
        )}
        {data.evMarkers.map((m, i) => (
          <g key={i}>
            <circle cx={m.x} cy={m.y} r="4" fill="hsl(var(--accent))" stroke="white" strokeWidth="1.5" />
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-primary" />Départ</span>
        {data.projected.length > 1 && (
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-destructive" />Arrivée</span>
        )}
        {data.evMarkers.length > 0 && (
          <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-accent" />Événements</span>
        )}
      </div>
    </div>
  );
}
