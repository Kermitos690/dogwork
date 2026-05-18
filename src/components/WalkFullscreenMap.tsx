import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalkMapLive } from "@/components/WalkMapLive";
import {
  X, Square, Hand, Maximize2, Droplets, Dog, User, AlertCircle, Heart, AlertTriangle, Volume2,
} from "lucide-react";

interface GpsPoint { lat: number; lng: number; t: number; accuracy?: number; }
interface WalkEvent { type: string; label: string; t: number; lat?: number; lng?: number; }

interface Props {
  points: GpsPoint[];
  events: WalkEvent[];
  durationSec: number;
  distanceMeters: number;
  onClose: () => void;
  onStop: () => void;
  onEvent: (type: string, label: string) => void;
}

const QUICK_EVENTS: { type: string; label: string; icon: any }[] = [
  { type: "pee", label: "Pipi", icon: Droplets },
  { type: "poop", label: "Caca", icon: Droplets },
  { type: "dog_seen", label: "Chien", icon: Dog },
  { type: "human_seen", label: "Humain", icon: User },
  { type: "fear", label: "Peur", icon: AlertCircle },
  { type: "calm", label: "Calme", icon: Heart },
  { type: "leash_pull", label: "Traction", icon: AlertTriangle },
  { type: "noise", label: "Bruit", icon: Volume2 },
];

export function WalkFullscreenMap({
  points, events, durationSec, distanceMeters, onClose, onStop, onEvent,
}: Props) {
  const [oneHand, setOneHand] = useState(true);
  const [side, setSide] = useState<"right" | "left">("right");

  // En mode une main, on n'affiche que 4 raccourcis (les plus utiles), au pouce.
  const eventsToShow = oneHand ? QUICK_EVENTS.slice(0, 4) : QUICK_EVENTS;

  return (
    <div className="fixed inset-0 z-[1000] bg-background flex flex-col">
      {/* Carte plein écran */}
      <div className="absolute inset-0">
        <WalkMapLive points={points} events={events} height={undefined as any} follow />
      </div>

      {/* Top bar : stats + fermer */}
      <div className="relative z-10 flex items-start justify-between p-3 pointer-events-none">
        <div className="rounded-2xl bg-background/90 backdrop-blur px-4 py-2 shadow-lg pointer-events-auto">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold leading-none">{Math.floor(durationSec / 60)}'</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">durée</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold leading-none">{(distanceMeters / 1000).toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">km</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold leading-none">{points.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">pts</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 pointer-events-auto">
          <Button size="icon" variant="secondary" className="h-12 w-12 rounded-full shadow-lg" onClick={onClose} aria-label="Fermer la carte plein écran">
            <X className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant={oneHand ? "default" : "secondary"}
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={() => setOneHand((v) => !v)}
            aria-label="Mode une main"
            title="Mode une main"
          >
            <Hand className="h-5 w-5" />
          </Button>
          {oneHand && (
            <Button
              size="icon"
              variant="secondary"
              className="h-12 w-12 rounded-full shadow-lg"
              onClick={() => setSide((s) => (s === "right" ? "left" : "right"))}
              aria-label="Changer de côté"
              title="Changer de côté"
            >
              <Maximize2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Bas : événements + stop, dimensionnés gros doigt / pouce */}
      <div className={`relative z-10 mt-auto p-3 pb-[calc(env(safe-area-inset-bottom,0)+0.75rem)] ${oneHand ? (side === "right" ? "ml-auto w-[88%] sm:w-[60%]" : "mr-auto w-[88%] sm:w-[60%]") : "w-full"}`}>
        <div className="rounded-2xl bg-background/95 backdrop-blur shadow-xl p-3 space-y-3">
          {events.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Dernier événement</span>
              <Badge variant="secondary" className="text-xs">{events[events.length - 1].label}</Badge>
            </div>
          )}
          <div className={`grid gap-2 ${oneHand ? "grid-cols-2" : "grid-cols-4"}`}>
            {eventsToShow.map((e) => {
              const Icon = e.icon;
              return (
                <Button
                  key={e.type}
                  type="button"
                  variant="outline"
                  className="h-16 flex flex-col gap-1 text-sm"
                  onClick={() => onEvent(e.type, e.label)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{e.label}</span>
                </Button>
              );
            })}
          </div>
          <Button
            onClick={onStop}
            variant="destructive"
            className="w-full h-14 text-base font-semibold"
          >
            <Square className="h-5 w-5 mr-2" />Terminer la promenade
          </Button>
        </div>
      </div>
    </div>
  );
}
