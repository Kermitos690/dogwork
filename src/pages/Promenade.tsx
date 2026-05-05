import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin, Play, Square, Loader2, Cloud, AlertTriangle, PencilLine, Smartphone, Droplets, Dog, User, AlertCircle, Heart, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDogs, useActiveDog } from "@/hooks/useDogs";

type Phase = "idle" | "active" | "summary";
type GpsState = "idle" | "watching" | "denied" | "unavailable";

interface GpsPoint { lat: number; lng: number; t: number; accuracy?: number; }
interface WalkEvent { type: string; label: string; t: number; lat?: number; lng?: number; }
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

function haversine(a: GpsPoint, b: GpsPoint): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function Promenade() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: dogs } = useDogs();
  const activeDog = useActiveDog();
  const [searchParams] = useSearchParams();
  const prefilledDogId = searchParams.get("dogId");
  const prefilledDayId = searchParams.get("dayId");

  const [dogId, setDogId] = useState<string>("");
  const [dayId, setDayId] = useState<number | null>(prefilledDayId ? Number(prefilledDayId) : null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [points, setPoints] = useState<GpsPoint[]>([]);
  const [events, setEvents] = useState<WalkEvent[]>([]);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [weather, setWeather] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [gpsState, setGpsState] = useState<GpsState>("idle");
  const [manualMode, setManualMode] = useState(false);
  const [manualDuration, setManualDuration] = useState<number>(20);
  const [manualDistance, setManualDistance] = useState<number>(1.5);

  const [pee, setPee] = useState(false);
  const [poop, setPoop] = useState(false);
  const [play, setPlay] = useState<"none" | "little" | "enough">("none");
  const [zoneAfter, setZoneAfter] = useState<"green" | "orange" | "red">("green");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dogId) {
      if (prefilledDogId) setDogId(prefilledDogId);
      else if (activeDog?.id) setDogId(activeDog.id);
    }
  }, [activeDog, dogId, prefilledDogId]);

  useEffect(() => {
    if (phase !== "active") return;
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [phase]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("dog_walks" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setHistory((data as any[]) ?? []));
  }, [user, phase]);

  const dogList = dogs ?? [];
  const distance = points.length < 2 ? 0 : points.slice(1).reduce((acc, p, i) => acc + haversine(points[i], p), 0);
  const duration = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) + tick * 0 : 0;
  const selectedDogName = useMemo(() => dogList.find((d: any) => d.id === dogId)?.name ?? "", [dogList, dogId]);

  function start() {
    if (!dogId) { toast({ title: "Sélectionnez un chien", variant: "destructive" }); return; }
    setPoints([]); setEvents([]); setStartedAt(new Date()); setPhase("active"); setWeather(null); setGpsState("idle");

    if (manualMode || !("geolocation" in navigator)) {
      setGpsState("unavailable");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsState("watching");
        const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: Date.now(), accuracy: pos.coords.accuracy };
        setPoints((prev) => [...prev, pt]);
        if (!weather) {
          supabase.functions.invoke("get-walk-weather", { body: { lat: pt.lat, lng: pt.lng } })
            .then(({ data }) => { if (data?.ok) setWeather(data); })
            .catch(() => { /* météo optionnelle */ });
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsState("denied");
          toast({
            title: "GPS refusé",
            description: "La promenade continue sans tracé. Mode manuel disponible.",
          });
        } else {
          setGpsState("unavailable");
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
    setWatchId(id);
  }

  function stop() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    setWatchId(null);
    setPhase("summary");
  }

  function addEvent(type: string, label: string) {
    const last = points[points.length - 1];
    setEvents((prev) => [...prev, { type, label, t: Date.now(), lat: last?.lat, lng: last?.lng }]);
    if (type === "pee") setPee(true);
    if (type === "poop") setPoop(true);
    toast({ title: label, description: "Événement ajouté à la balade." });
  }

  async function save() {
    if (!user || !dogId || !startedAt) return;
    setSaving(true);
    const endedAt = new Date();
    const start = points[0], end = points[points.length - 1];

    const useManual = points.length === 0;
    const finalDuration = useManual
      ? Math.max(1, manualDuration) * 60
      : Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
    const finalDistance = useManual
      ? Math.round(Math.max(0, manualDistance) * 1000)
      : Math.round(distance);

    const { data: walk, error } = await (supabase.from("dog_walks" as any).insert({
      user_id: user.id, dog_id: dogId,
      day_id: dayId,
      related_exercise_ids: [],
      started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(),
      duration_seconds: finalDuration,
      distance_meters: finalDistance,
      start_lat: start?.lat ?? null, start_lng: start?.lng ?? null,
      end_lat: end?.lat ?? null, end_lng: end?.lng ?? null,
      weather_provider: weather?.provider ?? null,
      weather_temperature_c: weather?.temperature_c ?? null,
      weather_condition: weather?.condition ?? null,
      weather_wind_kph: weather?.wind_kph ?? null,
      weather_humidity_percent: weather?.humidity_percent ?? null,
      weather_precipitation_mm: weather?.precipitation_mm ?? null,
      location_label: weather?.location_label ?? null,
      pee_done: pee, poop_done: poop, play_level: play, zone_after: zoneAfter,
      notes: notes || null,
    }).select().single() as any);

    if (!error && walk) {
      const gpsRows = points.map((p, i) => ({
        walk_id: walk.id, user_id: user.id, recorded_at: new Date(p.t).toISOString(),
        lat: p.lat, lng: p.lng, accuracy_meters: p.accuracy ?? null, sequence_index: i,
      }));
      const eventRows = events.map((e, i) => ({
        walk_id: walk.id, user_id: user.id, recorded_at: new Date(e.t).toISOString(),
        lat: e.lat ?? null, lng: e.lng ?? null,
        accuracy_meters: null, sequence_index: points.length + i,
        event_type: e.type, event_label: e.label,
      }));
      const allRows = [...gpsRows, ...eventRows];
      if (allRows.length) {
        await (supabase.from("dog_walk_points" as any).insert(allRows) as any);
      }
    }
    setSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Promenade enregistrée" });
    setPhase("idle"); setPee(false); setPoop(false); setPlay("none"); setZoneAfter("green");
    setNotes(""); setPoints([]); setEvents([]); setStartedAt(null); setWeather(null); setGpsState("idle");
  }

  return (
    <div className="min-h-screen pt-16 pb-32 sm:pb-12">
      <div className="container max-w-2xl py-6 space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to={dayId ? `/day/${dayId}?source=plan` : "/dashboard"}>
            <ArrowLeft className="h-4 w-4 mr-2" />Retour
          </Link>
        </Button>
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />Promenade
          </h1>
          <p className="text-muted-foreground mt-1">Enregistrez la balade : tracé, météo, comportement.</p>
          {dayId && (
            <Badge variant="secondary" className="mt-2">Liée au Jour {dayId}</Badge>
          )}
          <p className="text-xs text-muted-foreground mt-1">Vos données de promenade restent privées.</p>
        </header>

        {phase === "idle" && (
          <Card>
            <CardHeader><CardTitle className="text-base">Nouvelle promenade</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Chien</Label>
                <Select value={dogId} onValueChange={setDogId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un chien">
                      {selectedDogName || undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {dogList.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm">Mode manuel (sans GPS)</Label>
                  <p className="text-xs text-muted-foreground">Saisir durée et distance à la fin.</p>
                </div>
                <Switch checked={manualMode} onCheckedChange={setManualMode} />
              </div>

              <Button onClick={start} className="w-full" disabled={!dogId}>
                <Play className="h-4 w-4 mr-2" />Lancer la promenade
              </Button>
            </CardContent>
          </Card>
        )}

        {phase === "active" && (
          <Card className="border-primary/40">
            <CardHeader><CardTitle className="text-base">En cours…</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold">{Math.floor(duration / 60)}'</div>
                  <div className="text-xs text-muted-foreground">durée</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{(distance / 1000).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">km</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{points.length}</div>
                  <div className="text-xs text-muted-foreground">points</div>
                </div>
              </div>

              {gpsState === "denied" && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Accès GPS refusé</AlertTitle>
                  <AlertDescription className="text-xs space-y-1">
                    <p>iPhone / Safari : Réglages → Safari → Position → Autoriser.</p>
                    <p>App installée (PWA) : Réglages → DogWork → Position → Lors de l'utilisation.</p>
                    <p>Vous pouvez continuer en mode manuel : durée et distance saisies à la fin.</p>
                  </AlertDescription>
                </Alert>
              )}

              {gpsState === "unavailable" && !manualMode && (
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    GPS indisponible sur cet appareil. La balade sera enregistrée sans tracé.
                  </AlertDescription>
                </Alert>
              )}

              {weather && (
                <div className="text-sm text-muted-foreground flex items-center gap-2 border-t pt-3">
                  <Cloud className="h-4 w-4" />
                  {weather.condition} · {weather.temperature_c}°C
                  {weather.location_label ? ` · ${weather.location_label}` : ""}
                </div>
              )}

              <div className="border-t pt-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Événements ({events.length})
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_EVENTS.map((e) => {
                    const Icon = e.icon;
                    return (
                      <Button
                        key={e.type}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex flex-col h-auto py-2 px-1 gap-1"
                        onClick={() => addEvent(e.type, e.label)}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[10px]">{e.label}</span>
                      </Button>
                    );
                  })}
                </div>
                {events.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Dernier : {events[events.length - 1].label}
                  </p>
                )}
              </div>

              <Button onClick={stop} variant="destructive" className="w-full">
                <Square className="h-4 w-4 mr-2" />Terminer
              </Button>
            </CardContent>
          </Card>
        )}

        {phase === "summary" && (
          <Card>
            <CardHeader><CardTitle className="text-base">Résumé de la balade</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {points.length === 0 ? (
                <div className="rounded-lg border border-dashed p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <PencilLine className="h-4 w-4" /> Saisie manuelle
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Durée (min)</Label>
                      <Input
                        type="number" min={1} max={300} value={manualDuration}
                        onChange={(e) => setManualDuration(Number(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Distance (km)</Label>
                      <Input
                        type="number" min={0} step="0.1" max={50} value={manualDistance}
                        onChange={(e) => setManualDistance(Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {Math.floor(duration / 60)} min · {(distance / 1000).toFixed(2)} km
                  {weather && ` · ${weather.condition}, ${weather.temperature_c}°C`}
                </div>
              )}

              <div className="flex items-center justify-between"><Label>Pipi</Label><Switch checked={pee} onCheckedChange={setPee} /></div>
              <div className="flex items-center justify-between"><Label>Caca</Label><Switch checked={poop} onCheckedChange={setPoop} /></div>
              <div>
                <Label>Jeu</Label>
                <Select value={play} onValueChange={(v) => setPlay(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Pas aujourd'hui</SelectItem>
                    <SelectItem value="little">Un peu</SelectItem>
                    <SelectItem value="enough">Oui, bien assez</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Zone émotionnelle après</Label>
                <Select value={zoneAfter} onValueChange={(v) => setZoneAfter(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">🟢 Calme</SelectItem>
                    <SelectItem value="orange">🟠 Tendu</SelectItem>
                    <SelectItem value="red">🔴 Très réactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Incidents, croisements, observations…" />
              </div>
              <div className="flex gap-2">
                <Button onClick={save} disabled={saving} className="flex-1">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enregistrer
                </Button>
                <Button variant="ghost" onClick={() => setPhase("idle")}>Annuler</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {history.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Historique récent</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {history.map((w) => (
                <div key={w.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <div className="font-medium">
                      {new Date(w.started_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round((w.duration_seconds ?? 0) / 60)} min · {((w.distance_meters ?? 0) / 1000).toFixed(2)} km
                      {w.weather_condition && ` · ${w.weather_condition}`}
                      {w.day_id && <> · <span className="text-primary">Jour {w.day_id}</span></>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {w.pee_done && <Badge variant="secondary" className="text-xs">💧</Badge>}
                    {w.poop_done && <Badge variant="secondary" className="text-xs">💩</Badge>}
                    {w.zone_after === "green" && <Badge className="bg-emerald-600 text-xs">🟢</Badge>}
                    {w.zone_after === "orange" && <Badge className="bg-amber-500 text-xs">🟠</Badge>}
                    {w.zone_after === "red" && <Badge variant="destructive" className="text-xs">🔴</Badge>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
