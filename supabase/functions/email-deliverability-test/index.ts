import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ROOT_DOMAIN = 'dogwork-at-home.com'
const SENDER_SUBDOMAIN = 'notify.dogwork-at-home.com'

// DNS-over-HTTPS via Cloudflare
async function dnsLookup(name: string, type: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { Accept: 'application/dns-json' } }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!data.Answer) return []
    return data.Answer.map((a: any) => String(a.data || '').replace(/^"|"$/g, '').replace(/" "/g, ''))
  } catch (e) {
    console.error(`DNS lookup failed ${name} ${type}:`, e)
    return []
  }
}

interface DomainReport {
  domain: string
  spf: { found: boolean; raw: string[]; includes: string[]; warnings: string[] }
  dkim: { found: boolean; selectors: { selector: string; found: boolean; raw?: string }[] }
  dmarc: { found: boolean; raw: string; policy?: string; warnings: string[] }
  mx: { found: boolean; records: string[] }
  ns: { records: string[] }
}

async function inspectDomain(domain: string, dkimSelectors: string[]): Promise<DomainReport> {
  const [txtRoot, dmarcTxt, mxRec, nsRec] = await Promise.all([
    dnsLookup(domain, 'TXT'),
    dnsLookup(`_dmarc.${domain}`, 'TXT'),
    dnsLookup(domain, 'MX'),
    dnsLookup(domain, 'NS'),
  ])

  // SPF
  const spfRecords = txtRoot.filter((t) => t.toLowerCase().startsWith('v=spf1'))
  const spfWarnings: string[] = []
  if (spfRecords.length === 0) spfWarnings.push('Aucun enregistrement SPF trouvé')
  if (spfRecords.length > 1) spfWarnings.push('Plusieurs SPF détectés — fusionner en un seul')
  const includes: string[] = []
  for (const spf of spfRecords) {
    const parts = spf.split(/\s+/)
    for (const p of parts) {
      if (p.startsWith('include:')) includes.push(p.substring(8))
    }
    if (spf.includes('-all')) spfWarnings.push('Politique stricte (-all) — vérifier que tous les expéditeurs sont inclus')
  }

  // DKIM (test plusieurs sélecteurs en parallèle)
  const dkimResults = await Promise.all(
    dkimSelectors.map(async (selector) => {
      const records = await dnsLookup(`${selector}._domainkey.${domain}`, 'TXT')
      const found = records.some((r) => r.toLowerCase().includes('v=dkim1') || r.toLowerCase().includes('p='))
      return { selector, found, raw: records[0] }
    })
  )

  // DMARC
  const dmarcRecord = dmarcTxt.find((t) => t.toLowerCase().startsWith('v=dmarc1')) || ''
  const dmarcWarnings: string[] = []
  let dmarcPolicy: string | undefined
  if (!dmarcRecord) {
    dmarcWarnings.push('Aucun enregistrement DMARC — recommandé pour la délivrabilité')
  } else {
    const policyMatch = dmarcRecord.match(/p=(\w+)/i)
    dmarcPolicy = policyMatch?.[1]
    if (dmarcPolicy === 'none') dmarcWarnings.push('Politique DMARC = none (monitoring uniquement)')
  }

  return {
    domain,
    spf: { found: spfRecords.length > 0, raw: spfRecords, includes, warnings: spfWarnings },
    dkim: { found: dkimResults.some((d) => d.found), selectors: dkimResults },
    dmarc: { found: !!dmarcRecord, raw: dmarcRecord, policy: dmarcPolicy, warnings: dmarcWarnings },
    mx: { found: mxRec.length > 0, records: mxRec },
    ns: { records: nsRec },
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Auth: require admin
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

  let recipientEmail: string
  let sendLovable = true
  let sendIonos = false
  try {
    const body = await req.json()
    recipientEmail = body.recipientEmail
    sendLovable = body.sendLovable !== false
    sendIonos = body.sendIonos === true
    if (!recipientEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipientEmail)) {
      throw new Error('Invalid recipient email')
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const startedAt = Date.now()
  const triggeredAt = new Date().toISOString()
  const triggeredBy = userData.user.email || userData.user.id

  // === ENVOI LOVABLE ===
  let lovableResult: any = { attempted: false }
  if (sendLovable) {
    lovableResult = { attempted: true, channel: 'lovable', sender: SENDER_SUBDOMAIN }
    const t0 = Date.now()
    try {
      const idempotencyKey = `email-test-lovable-${crypto.randomUUID()}`
      const { data, error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'email-test-diagnostic',
          recipientEmail,
          idempotencyKey,
          templateData: { triggeredAt, triggeredBy, channel: 'Lovable (notify.dogwork-at-home.com)' },
        },
        headers: { Authorization: `Bearer ${jwt}` },
      })
      lovableResult.latencyMs = Date.now() - t0
      lovableResult.idempotencyKey = idempotencyKey
      if (error) {
        lovableResult.status = 'failed'
        lovableResult.error = error.message || String(error)
      } else {
        lovableResult.status = 'queued'
        lovableResult.response = data
      }
    } catch (e: any) {
      lovableResult.status = 'failed'
      lovableResult.error = e.message || String(e)
      lovableResult.latencyMs = Date.now() - t0
    }
  }

  // === ENVOI IONOS (via send-via-ionos / SMTP) ===
  let ionosResult: any = { attempted: false }
  if (sendIonos) {
    const ionosUser = Deno.env.get('IONOS_SMTP_USER')
    const ionosPass = Deno.env.get('IONOS_SMTP_PASSWORD')
    if (!ionosUser || !ionosPass) {
      ionosResult = {
        attempted: true,
        channel: 'ionos',
        status: 'not_configured',
        error: 'SMTP IONOS non configuré (secrets IONOS_SMTP_USER / IONOS_SMTP_PASSWORD manquants).',
      }
    } else {
      ionosResult = { attempted: true, channel: 'ionos', sender: ionosUser }
      const t0 = Date.now()
      const idempotencyKey = `email-test-ionos-${crypto.randomUUID()}`
      const ionosHtml = `
        <!DOCTYPE html>
        <html lang="fr"><head><meta charset="utf-8"></head>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f7fa;padding:24px;color:#1a202c;">
          <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
            <h1 style="color:#2563eb;margin:0 0 16px;font-size:22px;">DogWork — Test délivrabilité IONOS</h1>
            <p style="margin:0 0 12px;line-height:1.6;">Cet email confirme que la chaîne <strong>SMTP IONOS</strong> fonctionne :
            authentification réussie, envoi via <code>smtp.ionos.fr:587</code>, signature DKIM appliquée par IONOS.</p>
            <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:20px 0;font-size:14px;">
              <strong>Canal :</strong> IONOS SMTP<br>
              <strong>Expéditeur :</strong> ${ionosUser}<br>
              <strong>Déclenché par :</strong> ${triggeredBy}<br>
              <strong>Horodatage :</strong> ${triggeredAt}
            </div>
            <p style="margin:0;color:#64748b;font-size:13px;">Inspectez les en-têtes <code>Authentication-Results</code> pour vérifier SPF / DKIM / DMARC.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">© DogWork — Diagnostic email</p>
          </div>
        </body></html>`
      try {
        const { data, error } = await supabase.functions.invoke('send-via-ionos', {
          body: {
            to: recipientEmail,
            subject: `[DogWork] Test délivrabilité — IONOS SMTP`,
            html: ionosHtml,
            fromName: 'DogWork',
            replyTo: ionosUser,
            idempotencyKey,
          },
          headers: { Authorization: `Bearer ${jwt}` },
        })
        ionosResult.latencyMs = Date.now() - t0
        ionosResult.idempotencyKey = idempotencyKey
        if (error) {
          ionosResult.status = 'failed'
          ionosResult.error = error.message || String(error)
        } else if (data?.success === false) {
          ionosResult.status = 'failed'
          ionosResult.error = data?.details || data?.error || 'Send failed'
          ionosResult.smtpCode = data?.smtpCode
          ionosResult.hints = data?.hints
        } else {
          ionosResult.status = 'sent'
          ionosResult.response = data
        }
      } catch (e: any) {
        ionosResult.status = 'failed'
        ionosResult.error = e.message || String(e)
        ionosResult.latencyMs = Date.now() - t0
      }
    }
  }


  // === DNS / DELIVERABILITY CHECKS ===
  // Sélecteurs DKIM communs : Lovable utilise typiquement "lovable" / "lovable1", IONOS utilise "s1024"/"s2048"
  const [rootReport, subReport] = await Promise.all([
    inspectDomain(ROOT_DOMAIN, ['s1024', 's2048', 'default', 'lovable']),
    inspectDomain(SENDER_SUBDOMAIN, ['lovable', 'lovable1', 'default', 's1']),
  ])

  // === Récupère le statut réel de l'email Lovable depuis email_send_log ===
  if (lovableResult.idempotencyKey) {
    // Petite attente pour laisser le temps à l'enqueue de logger
    await new Promise((r) => setTimeout(r, 800))
    const { data: logRows } = await supabase
      .from('email_send_log')
      .select('status, error_message, message_id, created_at')
      .eq('message_id', lovableResult.idempotencyKey)
      .order('created_at', { ascending: false })
      .limit(1)
    if (logRows && logRows.length > 0) {
      lovableResult.logStatus = logRows[0].status
      lovableResult.logError = logRows[0].error_message
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      totalLatencyMs: Date.now() - startedAt,
      triggeredAt,
      triggeredBy,
      recipient: recipientEmail,
      send: { lovable: lovableResult, ionos: ionosResult },
      dns: { root: rootReport, sender: subReport },
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
