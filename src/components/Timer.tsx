import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimerProps {
  presets?: number[];
  onComplete?: () => void;
}

export function Timer({ presets = [30, 60, 180], onComplete }: TimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(60);
  const [remaining, setRemaining] = useState(60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clear();
            setRunning(false);
            onComplete?.();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return clear;
  }, [running, remaining, clear, onComplete]);

  const start = () => setRunning(true);
  const pause = () => { setRunning(false); clear(); };
  const reset = () => { pause(); setRemaining(totalSeconds); };
  const setPreset = (s: number) => { pause(); setTotalSeconds(s); setRemaining(s); };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;

  const presetLabels: Record<number, string> = { 30: "30s", 60: "1 min", 180: "3 min" };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-32 w-32">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold tabular-nums text-foreground">
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        {presets.map((p) => (
          <Button key={p} variant="outline" size="sm" onClick={() => setPreset(p)}>
            {presetLabels[p] || `${p}s`}
          </Button>
        ))}
      </div>

      <div className="flex gap-3">
        {!running ? (
          <Button size="xl" onClick={start} disabled={remaining === 0}>
            <Play className="h-5 w-5" />
            {remaining === totalSeconds ? "Démarrer" : "Reprendre"}
          </Button>
        ) : (
          <Button size="xl" variant="warning" onClick={pause}>
            <Pause className="h-5 w-5" /> Pause
          </Button>
        )}
        <Button size="lg" variant="outline" onClick={reset}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>
    </div>
  );
}
