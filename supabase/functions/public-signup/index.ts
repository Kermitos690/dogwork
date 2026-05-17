// Public signup endpoint (email-only).
// - No password input from the user: we generate a strong temporary password
//   server-side and email it to the user with a PDF guide.
// - Bot protection: honeypot field + minimum elapsed time + per-IP sliding
//   window rate limit (in-memory, per-instance — Supabase Auth throttles too).
// - Auto-confirms the email so the user can sign in immediately with the
//   credentials received by mail, then forces a password change on first login.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Bot / abuse protection ────────────────────────────────────────────────
const MIN_ELAPSED_MS = 2_500;      // form must take ≥2.5s to fill
const MAX_ATTEMPTS = 5;            // signups per IP / window
const WINDOW_MS = 15 * 60_000;     // 15 min
const LOCKOUT_MS = 60 * 60_000;    // 1 h lockout when exceeded

type Bucket = { count: number; first: number; lockedUntil: number };
const buckets = new Map<string, Bucket>();

function checkAndConsume(ip: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b) { b = { count: 0, first: now, lockedUntil: 0 }; buckets.set(ip, b); }
  if (b.lockedUntil > now) return { ok: false, retryAfter: Math.ceil((b.lockedUntil - now) / 1000) };
  if (now - b.first > WINDOW_MS) { b.count = 0; b.first = now; }
  b.count += 1;
  if (b.count > MAX_ATTEMPTS) {
    b.lockedUntil = now + LOCKOUT_MS;
    return { ok: false, retryAfter: Math.ceil(LOCKOUT_MS / 1000) };
  }
  return { ok: true };
}

function generateStrongPassword(length = 18): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*_+-=";
  const all = upper + lower + digits + special;
  const mandatory = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  const remaining = Array.from({ length: length - mandatory.length }, () =>
    all[Math.floor(Math.random() * all.length)]
  );
  const chars = [...mandatory, ...remaining];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

async function buildOnboardingPdf(opts: {
  name: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold);

  const brand = rgb(0.976, 0.451, 0.086); // #F97316
  const dark = rgb(0.10, 0.10, 0.18);
  const muted = rgb(0.40, 0.40, 0.46);
  const lightBg = rgb(1, 0.969, 0.929);

  // Header band
  page.drawRectangle({ x: 0, y: 760, width: 595, height: 82, color: brand });
  page.drawText("DogWork", { x: 40, y: 800, size: 28, font: helvB, color: rgb(1, 1, 1) });
  page.drawText("Vos identifiants de connexion", {
    x: 40, y: 778, size: 12, font: helv, color: rgb(1, 1, 1),
  });

  // Greeting
  let y = 720;
  page.drawText(`Bienvenue ${opts.name} !`, { x: 40, y, size: 18, font: helvB, color: dark });
  y -= 24;
  page.drawText("Votre compte DogWork vient d'etre cree. Conservez ce document :", {
    x: 40, y, size: 11, font: helv, color: muted,
  });
  y -= 14;
  page.drawText("il contient vos identifiants temporaires.", {
    x: 40, y, size: 11, font: helv, color: muted,
  });

  // Credentials card
  y -= 30;
  page.drawRectangle({ x: 40, y: y - 110, width: 515, height: 120, color: lightBg });
  page.drawText("Identifiant", { x: 60, y: y - 10, size: 10, font: helvB, color: muted });
  page.drawText(opts.email, { x: 60, y: y - 28, size: 13, font: helv, color: dark });

  page.drawText("Mot de passe temporaire", { x: 60, y: y - 56, size: 10, font: helvB, color: muted });
  page.drawText(opts.tempPassword, { x: 60, y: y - 74, size: 14, font: helvB, color: brand });

  page.drawText("Lien de connexion", { x: 60, y: y - 96, size: 10, font: helvB, color: muted });
  page.drawText(opts.loginUrl, { x: 175, y: y - 96, size: 10, font: helv, color: dark });

  // Steps
  y -= 140;
  page.drawText("Premiere connexion", { x: 40, y, size: 14, font: helvB, color: dark });
  const steps = [
    "1. Ouvrez le lien de connexion ci-dessus.",
    "2. Saisissez votre email et le mot de passe temporaire.",
    "3. Changez votre mot de passe lors de la premiere connexion.",
    "4. Completez le profil de votre chien pour demarrer.",
  ];
  for (const line of steps) {
    y -= 18;
    page.drawText(line, { x: 40, y, size: 11, font: helv, color: dark });
  }

  // Security note
  y -= 40;
  page.drawText("Securite", { x: 40, y, size: 14, font: helvB, color: dark });
  y -= 18;
  page.drawText("Ne partagez jamais ces identifiants. DogWork ne vous demandera", {
    x: 40, y, size: 10, font: helv, color: muted,
  });
  y -= 13;
  page.drawText("jamais votre mot de passe par email ou par telephone.", {
    x: 40, y, size: 10, font: helv, color: muted,
  });

  // Footer
  page.drawText("DogWork — www.dogwork-at-home.com", {
    x: 40, y: 40, size: 9, font: helv, color: muted,
  });

  return await pdf.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      "unknown";

    const body = await req.json().catch(() => ({}));
    const {
      email,
      displayName,
      website,    // honeypot — must be empty
      startedAt,  // client timestamp (ms) when the form mounted
      loginUrl: clientLoginUrl,
    } = body || {};

    // ── Honeypot ──────────────────────────────────────────────
    if (typeof website === "string" && website.trim().length > 0) {
      // Pretend success to avoid signaling the trap.
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Elapsed time ──────────────────────────────────────────
    const started = typeof startedAt === "number" ? startedAt : 0;
    if (!started || Date.now() - started < MIN_ELAPSED_MS) {
      return new Response(JSON.stringify({ error: "Requete invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Rate limit ────────────────────────────────────────────
    const rl = checkAndConsume(ip);
    if (!rl.ok) {
      return new Response(JSON.stringify({
        error: "Trop de tentatives. Reessayez plus tard.",
        retryAfter: rl.retryAfter,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retryAfter) },
      });
    }

    // ── Validate email ────────────────────────────────────────
    if (typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRe.test(normalizedEmail) || normalizedEmail.length > 254) {
      return new Response(JSON.stringify({ error: "Email invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const effectiveDisplayName =
      (typeof displayName === "string" && displayName.trim().length > 0
        ? displayName.trim()
        : normalizedEmail.split("@")[0]).slice(0, 80);

    // ── Look up existing user (paginated) ─────────────────────
    let existing: any = null;
    let page = 1;
    const perPage = 100;
    while (!existing) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      if (!data?.users?.length) break;
      existing = data.users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
      if (data.users.length < perPage) break;
      page++;
    }
    // Always respond the same way on duplicate to avoid email enumeration.
    if (existing && !existing.deleted_at) {
      return new Response(JSON.stringify({
        success: true,
        message:
          "Si cette adresse n'est pas deja enregistree, vous recevrez vos identifiants par email.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (existing?.deleted_at) {
      await admin.auth.admin.deleteUser(existing.id).catch(() => {});
      existing = null;
    }

    // ── Create the user ───────────────────────────────────────
    const tempPassword = generateStrongPassword(18);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        display_name: effectiveDisplayName,
        must_change_password: true,
        signup_source: "public_form",
      },
    });
    if (createErr || !created?.user) {
      throw createErr || new Error("Creation impossible");
    }
    const userId = created.user.id;

    // Profile + owner role
    await admin.from("profiles").upsert(
      { user_id: userId, display_name: effectiveDisplayName },
      { onConflict: "user_id" },
    );
    const { data: existingRole } = await admin
      .from("user_roles").select("id").eq("user_id", userId).eq("role", "owner").maybeSingle();
    if (!existingRole) {
      await admin.from("user_roles").insert({ user_id: userId, role: "owner" });
    }

    // ── PDF + signed URL ──────────────────────────────────────
    const loginUrl =
      (typeof clientLoginUrl === "string" && /^https:\/\//.test(clientLoginUrl))
        ? clientLoginUrl
        : "https://www.dogwork-at-home.com/auth";

    let pdfUrl: string | undefined;
    try {
      const pdfBytes = await buildOnboardingPdf({
        name: effectiveDisplayName,
        email: normalizedEmail,
        tempPassword,
        loginUrl,
      });
      const safe = normalizedEmail.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const path = `${safe}/${Date.now()}.pdf`;
      const { error: upErr } = await admin.storage
        .from("onboarding-pdfs")
        .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await admin.storage
        .from("onboarding-pdfs")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signErr) throw signErr;
      pdfUrl = signed?.signedUrl;
    } catch (e) {
      console.error("[public-signup] PDF/upload failed", e);
    }

    // ── Email transactionnel ──────────────────────────────────
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "admin-credentials",
          recipientEmail: normalizedEmail,
          idempotencyKey: `public-signup-${userId}`,
          templateData: {
            name: effectiveDisplayName,
            role: "owner",
            loginEmail: normalizedEmail,
            temporaryPassword: tempPassword,
            pdfUrl,
          },
        },
      });
    } catch (e) {
      console.error("[public-signup] email send failed", e);
    }

    return new Response(JSON.stringify({
      success: true,
      message:
        "Compte cree. Vos identifiants et votre guide PDF viennent d'etre envoyes par email.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[public-signup] ERROR", err);
    return new Response(JSON.stringify({ error: err?.message || "Erreur inattendue" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
