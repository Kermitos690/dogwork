// send-via-ionos
// Envoi SMTP authentifié via IONOS (smtp.ionos.fr:587, STARTTLS).
// Journalisation dans email_send_log (template_name = 'ionos_smtp').
// Auth: requiert un JWT admin (RBAC: has_role).
//
// Body attendu:
// {
//   "to": "destinataire@example.com",
//   "subject": "Sujet",
//   "html": "<p>Contenu HTML</p>",
//   "text": "Contenu texte (optionnel)",
//   "fromName": "DogWork" (optionnel),
//   "replyTo": "contact@dogwork-at-home.com" (optionnel),
//   "idempotencyKey": "..." (optionnel)
// }

import { createClient } from 'npm:@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMTP_HOST = Deno.env.get('IONOS_SMTP_HOST') || 'smtp.ionos.fr'
const SMTP_PORT = parseInt(Deno.env.get('IONOS_SMTP_PORT') || '587', 10)
const SMTP_USER = Deno.env.get('IONOS_SMTP_USER') // ex: contact@dogwork-at-home.com
const SMTP_PASS = Deno.env.get('IONOS_SMTP_PASSWORD')
const FROM_ADDRESS = Deno.env.get('IONOS_FROM_ADDRESS') || SMTP_USER || ''

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
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const jwt = authHeader.replace('Bearer ', '')
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const { data: isAdmin } = await supabase.rpc('has_role', {
    _user_id: userData.user.id, _role: 'admin',
  })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Admin required' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ====== CONFIG CHECK ======
  if (!SMTP_USER || !SMTP_PASS) {
    return new Response(
      JSON.stringify({
        error: 'SMTP IONOS non configuré',
        details: 'Les secrets IONOS_SMTP_USER et IONOS_SMTP_PASSWORD doivent être définis.',
        configured: { user: !!SMTP_USER, password: !!SMTP_PASS },
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // ====== BODY ======
  let body: SendBody
  try {
    body = await req.json()
    if (!body.to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.to)) throw new Error('Invalid "to"')
    if (!body.subject || typeof body.subject !== 'string') throw new Error('Missing "subject"')
    if (!body.html || typeof body.html !== 'string') throw new Error('Missing "html"')
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Invalid body', details: e.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const messageId = body.idempotencyKey || `ionos-${crypto.randomUUID()}`
  const fromName = body.fromName || 'DogWork'
  const fromHeader = `${fromName} <${FROM_ADDRESS}>`
  const text = body.text || htmlToText(body.html)

  // ====== LOG: pending ======
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'ionos_smtp',
    recipient_email: body.to,
    status: 'pending',
    metadata: { channel: 'ionos', from: fromHeader, subject: body.subject, triggered_by: userData.user.email },
  })

  // ====== SMTP SEND (denomailer — Deno-native, supporte STARTTLS sur 587) ======
  const startedAt = Date.now()
  let client: SMTPClient | null = null
  try {
    client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: SMTP_PORT === 465, // 465 = TLS direct, 587 = STARTTLS (auto)
        auth: {
          username: SMTP_USER,
          password: SMTP_PASS,
        },
      },
    })

    await client.send({
      from: fromHeader,
      to: body.to,
      subject: body.subject,
      content: text,
      html: body.html,
      replyTo: body.replyTo || FROM_ADDRESS,
      headers: {
        'Message-ID': `<${messageId}@${(FROM_ADDRESS.split('@')[1] || 'dogwork-at-home.com')}>`,
      },
    })

    await client.close()
    client = null

    const latencyMs = Date.now() - startedAt

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'ionos_smtp',
      recipient_email: body.to,
      status: 'sent',
      metadata: {
        channel: 'ionos',
        smtp_host: SMTP_HOST,
        smtp_port: SMTP_PORT,
        latency_ms: latencyMs,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        messageId,
        latencyMs,
        smtp: { host: SMTP_HOST, port: SMTP_PORT, from: fromHeader },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    const latencyMs = Date.now() - startedAt
    const errorMsg = e?.message || String(e)
    console.error('IONOS SMTP send failed:', errorMsg, e?.code)

    try { if (client) await client.close() } catch (_) { /* noop */ }

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'ionos_smtp',
      recipient_email: body.to,
      status: 'failed',
      error_message: errorMsg,
      metadata: { channel: 'ionos', latency_ms: latencyMs, smtp_code: e?.code, smtp_host: SMTP_HOST },
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: 'SMTP send failed',
        details: errorMsg,
        smtpCode: e?.code,
        latencyMs,
        hints: [
          'Vérifier que IONOS_SMTP_USER est l\'adresse email complète (ex: contact@dogwork-at-home.com)',
          'Vérifier le mot de passe SMTP dans IONOS Mail',
          'Vérifier que la boîte autorise SMTP (paramètres IONOS)',
          'Si erreur de DNS/connect: smtp.ionos.fr peut nécessiter smtp.ionos.com selon la région',
        ],
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
