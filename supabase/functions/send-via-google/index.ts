// send-via-google
// Envoi SMTP authentifié via Google Workspace (smtp.gmail.com:587, STARTTLS).
// Journalisation dans email_send_log (template_name = 'google_workspace_smtp').
// Auth: requiert un JWT admin (RBAC: has_role).
//
// Secrets requis:
//   GOOGLE_SMTP_USER     (ex: admin@dogwork-at-home.com)
//   GOOGLE_SMTP_PASSWORD (mot de passe d'application Google — pas le mot de passe du compte)
//   GOOGLE_SMTP_FROM     (optionnel, défaut = GOOGLE_SMTP_USER)

import { createClient } from 'npm:@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMTP_HOST = 'smtp.gmail.com'
const SMTP_PORT = 587
const SMTP_USER = Deno.env.get('GOOGLE_SMTP_USER')
const SMTP_PASS = Deno.env.get('GOOGLE_SMTP_PASSWORD')
const FROM_ADDRESS = Deno.env.get('GOOGLE_SMTP_FROM') || SMTP_USER || ''

interface SendBody {
  to: string
  subject: string
  html: string
  text?: string
  fromName?: string
  replyTo?: string
  idempotencyKey?: string
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // ====== AUTH: admin only ======
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, errorCode: 'NO_AUTH', errorMessage: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const jwt = authHeader.replace('Bearer ', '')
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ ok: false, errorCode: 'INVALID_TOKEN', errorMessage: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' })
  if (!isAdmin) {
    return new Response(JSON.stringify({ ok: false, errorCode: 'NOT_ADMIN', errorMessage: 'Admin required' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ====== CONFIG CHECK ======
  if (!SMTP_USER) {
    return new Response(JSON.stringify({
      ok: false, provider: 'google_workspace',
      errorCode: 'MISSING_SMTP_USER',
      errorMessage: "Adresse Google SMTP manquante (secret GOOGLE_SMTP_USER).",
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  if (!SMTP_PASS) {
    return new Response(JSON.stringify({
      ok: false, provider: 'google_workspace',
      errorCode: 'MISSING_SMTP_PASSWORD',
      errorMessage: "Mot de passe d'application Google manquant (secret GOOGLE_SMTP_PASSWORD).",
    }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // ====== BODY ======
  let body: SendBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, errorCode: 'BAD_JSON', errorMessage: 'Invalid JSON body' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (!body.to || !body.subject || !body.html) {
    return new Response(JSON.stringify({ ok: false, errorCode: 'MISSING_FIELDS', errorMessage: 'to, subject, html requis' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const fromName = body.fromName || 'DogWork'
  const idempotencyKey = body.idempotencyKey || `google-smtp-${crypto.randomUUID()}`
  const startedAt = Date.now()

  // Pre-log pending
  await supabase.from('email_send_log').insert({
    message_id: idempotencyKey,
    template_name: 'google_workspace_smtp',
    recipient_email: body.to,
    status: 'pending',
    metadata: { provider: 'google_workspace', from: FROM_ADDRESS, subject: body.subject },
  })

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: false, // STARTTLS upgrade
      auth: { username: SMTP_USER, password: SMTP_PASS },
    },
  })

  try {
    await client.send({
      from: `${fromName} <${FROM_ADDRESS}>`,
      to: body.to,
      replyTo: body.replyTo || FROM_ADDRESS,
      subject: body.subject,
      content: body.text || htmlToText(body.html),
      html: body.html,
    })
    await client.close()

    const latencyMs = Date.now() - startedAt
    await supabase.from('email_send_log').insert({
      message_id: idempotencyKey,
      template_name: 'google_workspace_smtp',
      recipient_email: body.to,
      status: 'sent',
      metadata: { provider: 'google_workspace', from: FROM_ADDRESS, latencyMs },
    })

    return new Response(JSON.stringify({
      ok: true, success: true, provider: 'google_workspace',
      from: FROM_ADDRESS, to: body.to,
      messageId: idempotencyKey, latencyMs,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    try { await client.close() } catch {}
    const errMsg = String(e?.message || e)
    const latencyMs = Date.now() - startedAt

    let errorCode = 'SMTP_ERROR'
    let friendly = errMsg
    if (/auth|535|534|credentials/i.test(errMsg)) {
      errorCode = 'GOOGLE_AUTH_REFUSED'
      friendly = "Authentification Google refusée. Vérifier le mot de passe d'application Google (pas le mot de passe du compte) et que la 2FA est activée."
    } else if (/timeout|timed out/i.test(errMsg)) {
      errorCode = 'SMTP_TIMEOUT'
      friendly = "Timeout SMTP Google. Réessayer."
    }

    await supabase.from('email_send_log').insert({
      message_id: idempotencyKey,
      template_name: 'google_workspace_smtp',
      recipient_email: body.to,
      status: 'failed',
      error_message: friendly,
      metadata: { provider: 'google_workspace', from: FROM_ADDRESS, errorCode, raw: errMsg, latencyMs },
    })

    return new Response(JSON.stringify({
      ok: false, success: false, provider: 'google_workspace',
      from: FROM_ADDRESS, errorCode, errorMessage: friendly, raw: errMsg, latencyMs,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
