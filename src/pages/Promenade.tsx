import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Play, Square, Loader2, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDogs, useActiveDog } from "@/hooks/useDogs";

type Phase = "idle" | "active" | "summary";

interface GpsPoint { lat: number; lng: number; t: number; accuracy?: number; }

function haversine(a: GpsPoint, b: GpsPoint): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function Promenade() {
  const { user } = useAuth();
  const { toast } = useToast();
  const dogs = useDogs();
  const activeDog = useActiveDog();
  const [dogId, setDogId] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [points, setPoints] = useState<GpsPoint[]>([]);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [weather, setWeather] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const [pee, setPee] = useState(false);
  const [poop, setPoop] = useState(false);
  const [play, setPlay] = useState<"none" | "little" | "enough">("none");
  const [zoneAfter, setZoneAfter] = useState<"green" | "orange" | "red">("green");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dogId && activeDog?.id) setDogId(activeDog.id);
  }, [activeDog, dogId]);

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

  const distance = points.length < 2 ? 0 : points.slice(1).reduce((acc, p, i) => acc + haversine(points[i], p), 0);
  const duration = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) + tick * 0 : 0;

  function start() {
    if (!dogId) { toast({ title: "Sélectionnez un chien", variant: "destructive" }); return; }
    setPoints([]); setStartedAt(new Date()); setPhase("active"); setWeather(null);
    if ("geolocation" in navigator) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: Date.now(), accuracy: pos.coords.accuracy };
          setPoints((prev) => [...prev, pt]);
          if (!weather) {
            supabase.functions.invoke("get-walk-weather", { body: { lat: pt.lat, lng: pt.lng } })
              .then(({ data }) => { if (data?.ok) setWeather(data); });
          }
        },
        () => toast({ title: "GPS indisponible", description: "La promenade continue sans tracé." }),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
      setWatchId(id);
    }
  }

  function stop() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    setWatchId(null);
    setPhase("summary");
  }

  async function save() {
    if (!user || !dogId || !startedAt) return;
    setSaving(true);
    const endedAt = new Date();
    const start = points[0], end = points[points.length - 1];
    const { data: walk, error } = await (supabase.from("dog_walks" as any).insert({
      user_id: user.id, dog_id: dogId,
      started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(),
      duration_seconds: Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000),
      distance_meters: Math.round(distance),
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

    if (!error && walk && points.length > 0) {
      const rows = points.map((p, i) => ({
        walk_id: walk.id, user_id: user.id, recorded_at: new Date(p.t).toISOString(),
        lat: p.lat, lng: p.lng, accuracy_meters: p.accuracy ?? null, sequence_index: i,
      }));
      await (supabase.from("dog_walk_points" as any).insert(rows) as any);
    }
    setSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Promenade enregistrée" });
    setPhase("idle"); setPee(false); setPoop(false); setPlay("none"); setZoneAfter("green"); setNotes(""); setPoints([]); setStartedAt(null); setWeather(null);
  }

  return (
    <div className="min-h-screen pt-16 pb-32 sm:pb-12">
      <div className="container max-w-2xl py-6 space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Link>
        </Button>
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="h-6 w-6 text-primary" />Promenade</h1>
          <p className="text-muted-foreground mt-1">Enregistrez la balade : tracé, météo, comportement.</p>
          <p className="text-xs text-muted-foreground mt-1">Vos données de promenade restent privées.</p>
        </header>

        {phase === "idle" && (
          <Card>
            <CardHeader><CardTitle className="text-base">Nouvelle promenade</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Chien</Label>
                <Select value={dogId} onValueChange={setDogId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionnez un chien" /></SelectTrigger>
                  <SelectContent>
                    {(dogs.data ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                <div><div className="text-2xl font-bold">{Math.floor(duration / 60)}'</div><div className="text-xs text-muted-foreground">durée</div></div>
                <div><div className="text-2xl font-bold">{(distance / 1000).toFixed(2)}</div><div className="text-xs text-muted-foreground">km</div></div>
                <div><div className="text-2xl font-bold">{points.length}</div><div className="text-xs text-muted-foreground">points</div></div>
              </div>
              {weather && (
                <div className="text-sm text-muted-foreground flex items-center gap-2 border-t pt-3">
                  <Cloud className="h-4 w-4" />
                  {weather.condition} · {weather.temperature_c}°C{weather.location_label ? ` · ${weather.location_label}` : ""}
                </div>
              )}
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
              <div className="text-sm text-muted-foreground">
                {Math.floor(duration / 60)} min · {(distance / 1000).toFixed(2)} km
                {weather && ` · ${weather.condition}, ${weather.temperature_c}°C`}
              </div>
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
                    <div className="font-medium">{new Date(w.started_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round((w.duration_seconds ?? 0) / 60)} min · {((w.distance_meters ?? 0) / 1000).toFixed(2)} km
                      {w.weather_condition && ` · ${w.weather_condition}`}
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
