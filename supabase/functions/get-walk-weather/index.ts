// Edge Function: get-walk-weather
// Returns current weather for given lat/lng using Open-Meteo (no API key required).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lat, lng } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(
        JSON.stringify({ ok: false, error: "lat/lng required as numbers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m");
    url.searchParams.set("wind_speed_unit", "kmh");
    url.searchParams.set("timezone", "auto");

    const r = await fetch(url.toString());
    if (!r.ok) {
      return new Response(
        JSON.stringify({ ok: false, provider: "open-meteo", error: `HTTP ${r.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const data = await r.json();
    const c = data.current ?? {};

    // weather_code → simple label (WMO codes)
    const codeMap: Record<number, string> = {
      0: "Ciel clair", 1: "Globalement clair", 2: "Partiellement nuageux", 3: "Couvert",
      45: "Brouillard", 48: "Brouillard givrant",
      51: "Bruine légère", 53: "Bruine", 55: "Bruine forte",
      61: "Pluie légère", 63: "Pluie", 65: "Pluie forte",
      71: "Neige légère", 73: "Neige", 75: "Neige forte",
      80: "Averses", 81: "Averses", 82: "Averses violentes",
      95: "Orage", 96: "Orage avec grêle", 99: "Orage violent",
    };
    const condition = codeMap[c.weather_code as number] ?? "Inconnu";

    // Reverse-geocode label (best-effort, no key)
    let location_label: string | undefined;
    try {
      const geo = await fetch(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lng}&language=fr&count=1`,
      );
      if (geo.ok) {
        const g = await geo.json();
        const r0 = g.results?.[0];
        if (r0) location_label = [r0.name, r0.admin1].filter(Boolean).join(", ");
      }
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({
        ok: true,
        provider: "open-meteo",
        temperature_c: c.temperature_2m,
        condition,
        wind_kph: c.wind_speed_10m,
        humidity_percent: c.relative_humidity_2m,
        precipitation_mm: c.precipitation,
        location_label,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
