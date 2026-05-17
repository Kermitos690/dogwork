import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SECURITY: in-memory rate limit against PIN brute-force.
// Per-instance only — Supabase Auth already throttles globally, this adds
// an explicit lockout on top to mitigate the 6-digit search space.
const MAX_ATTEMPTS = 8;          // failed attempts per window
const WINDOW_MS = 15 * 60_000;   // 15 min sliding window
const LOCKOUT_MS = 30 * 60_000;  // 30 min lockout when exceeded

type Bucket = { count: number; first: number; lockedUntil: number };
const buckets = new Map<string, Bucket>();

function rateLimitKey(email: string, ip: string): string {
  return `${email}::${ip}`;
}
function checkAndConsume(key: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) { b = { count: 0, first: now, lockedUntil: 0 }; buckets.set(key, b); }
  if (b.lockedUntil > now) return { ok: false, retryAfter: Math.ceil((b.lockedUntil - now) / 1000) };
  if (now - b.first > WINDOW_MS) { b.count = 0; b.first = now; }
  return { ok: true };
}
function registerFailure(key: string) {
  const now = Date.now();
  const b = buckets.get(key) ?? { count: 0, first: now, lockedUntil: 0 };
  if (now - b.first > WINDOW_MS) { b.count = 0; b.first = now; }
  b.count += 1;
  if (b.count >= MAX_ATTEMPTS) b.lockedUntil = now + LOCKOUT_MS;
  buckets.set(key, b);
}
function registerSuccess(key: string) { buckets.delete(key); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, pin } = await req.json();

    if (typeof email !== "string" || typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: "Email et PIN à 6 chiffres requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const normalizedEmail = email.trim().toLowerCase();
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const key = rateLimitKey(normalizedEmail, ip);

    const gate = checkAndConsume(key);
    if (!gate.ok) {
      return new Response(
        JSON.stringify({ error: "Trop de tentatives. Réessayez plus tard." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(gate.retryAfter),
          },
        }
      );
    }

    // Server-side derivation — formula never leaves the server
    const derivedPassword = `DogWork!${pin}#Secure`;

    const client = createClient(supabaseUrl, anonKey);
    const { data, error } = await client.auth.signInWithPassword({
      email: normalizedEmail,
      password: derivedPassword,
    });

    if (error || !data.session) {
      registerFailure(key);
      return new Response(
        JSON.stringify({ error: "Email ou PIN incorrect" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    registerSuccess(key);
    return new Response(
      JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (_err) {
    return new Response(
      JSON.stringify({ error: "Erreur de connexion" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

