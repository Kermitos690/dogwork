import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  const key = Deno.env.get("GOOGLE_AI_API_KEY")!;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await res.json();
  const imageModels = (data.models || [])
    .filter((m: any) => m.name.includes("image") || m.supportedGenerationMethods?.includes("generateContent"))
    .map((m: any) => ({ name: m.name, methods: m.supportedGenerationMethods }))
    .filter((m: any) => m.name.toLowerCase().includes("image") || m.name.toLowerCase().includes("imagen"));
  return new Response(JSON.stringify(imageModels, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
