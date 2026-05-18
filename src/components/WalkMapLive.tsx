import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import L, { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface WalkMapPoint { lat: number; lng: number; t: number; }
export interface WalkMapEvent { type: string; label: string; lat?: number; lng?: number; t: number; }

interface Props {
  points: WalkMapPoint[];
  events?: WalkMapEvent[];
  height?: number;
  className?: string;
  /** En mode live, recentre/zoome sur le dernier point. En mode résumé, fit bounds. */
  follow?: boolean;
}

function FitOrFollow({ points, follow }: { points: WalkMapPoint[]; follow: boolean }) {
  const map = useMap();
  const didInitialFit = useRef(false);

  useEffect(() => {
    if (points.length === 0) return;
    if (follow) {
      const last = points[points.length - 1];
      if (!didInitialFit.current) {
        map.setView([last.lat, last.lng], 17, { animate: false });
        didInitialFit.current = true;
      } else {
        map.panTo([last.lat, last.lng], { animate: true });
      }
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16, { animate: false });
      return;
    }
    const bounds: LatLngBoundsExpression = points.map((p) => [p.lat, p.lng]);
    map.fitBounds(bounds, { padding: [24, 24], animate: false });
  }, [points, follow, map]);

  return null;
}

interface PropsExt extends Props { height?: number | string; }
export function WalkMapLive({ points, events = [], height = 260, className, follow = false }: PropsExt) {
  const path = useMemo<LatLngExpression[]>(
    () => points.map((p) => [p.lat, p.lng] as LatLngExpression),
    [points],
  );
  const start = points[0];
  const end = points[points.length - 1];
  const center: LatLngExpression = start ? [start.lat, start.lng] : [46.8, 8.2]; // fallback Suisse

  // Évite les icônes 404 par défaut de Leaflet (on n'utilise que CircleMarker)
  useEffect(() => {
    // @ts-ignore
    delete (L.Icon.Default.prototype as any)._getIconUrl;
  }, []);

  const resolvedHeight = height === undefined ? "100%" : height;
  return (
    <div className={className} style={{ height: resolvedHeight, width: "100%" }}>
      <MapContainer
        center={center}
        zoom={start ? 16 : 8}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", borderRadius: 12 }}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {path.length >= 2 && (
          <Polyline
            positions={path}
            pathOptions={{ color: "hsl(217, 91%, 60%)", weight: 5, opacity: 0.9, lineCap: "round", lineJoin: "round" }}
          />
        )}
        {start && (
          <CircleMarker
            center={[start.lat, start.lng]}
            radius={7}
            pathOptions={{ color: "white", weight: 2, fillColor: "hsl(142, 71%, 45%)", fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -6]}>Départ</Tooltip>
          </CircleMarker>
        )}
        {end && points.length > 1 && (
          <CircleMarker
            center={[end.lat, end.lng]}
            radius={8}
            pathOptions={{ color: "white", weight: 2, fillColor: follow ? "hsl(217, 91%, 60%)" : "hsl(0, 84%, 60%)", fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -6]}>{follow ? "Position actuelle" : "Arrivée"}</Tooltip>
          </CircleMarker>
        )}
        {events
          .filter((e) => typeof e.lat === "number" && typeof e.lng === "number")
          .map((e, i) => (
            <CircleMarker
              key={i}
              center={[e.lat!, e.lng!]}
              radius={5}
              pathOptions={{ color: "white", weight: 1.5, fillColor: "hsl(38, 92%, 50%)", fillOpacity: 1 }}
            >
              <Tooltip direction="top" offset={[0, -6]}>{e.label}</Tooltip>
            </CircleMarker>
          ))}
        <FitOrFollow points={points} follow={follow} />
      </MapContainer>
    </div>
  );
}

export default WalkMapLive;
