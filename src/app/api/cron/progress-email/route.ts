import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

// Called 3x per working day — 11:00, 14:00, 16:00 Belgrade (UTC+2 summer)
// Vercel cron: 09:00, 12:00, 14:00 UTC  (Mon-Fri only)
// Pass ?checkpoint=11 | 14 | 16

const PACE: Record<number, number> = { 11: 0.35, 14: 0.65, 16: 0.90 }

function weekStart() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

function fillTemplate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`))
}

function buildHtml(
  name: string,
  checkpoint: number,
  companies: number, targetCompanies: number,
  outreach: number, targetOutreach: number,
  meetings: number, targetMeetings: number,
  bodyText: string,
  isUrgent: boolean,
): string {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const metricRow = (label: string, actual: number, target: number) => {
    const pct = target > 0 ? Math.round((actual / target) * 100) : 0
    const color = pct >= 100 ? '#3ecf8e' : pct >= 50 ? '#f5a623' : '#ff4d4d'
    const barW = Math.min(100, pct)
    return `
      <tr>
        <td style="padding:8px 0;color:#a0a0b8;font-size:13px;width:120px;">${label}</td>
        <td style="padding:8px 0;">
          <div style="background:#1c1c27;border-radius:6px;height:8px;width:160px;overflow:hidden;">
            <div style="height:8px;width:${barW}%;background:${color};border-radius:6px;"></div>
          </div>
        </td>
        <td style="padding:8px 0 8px 12px;color:${color};font-weight:700;font-family:monospace;font-size:14px;">${actual}/${target}</td>
      </tr>`
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:sans-serif;color:#e8e8f0;">
<div style="max-width:560px;margin:0 auto;padding:28px 16px;">

  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-flex;align-items:center;gap:8px;background:#13131a;border:1px solid #2a2a3a;border-radius:10px;padding:10px 16px;">
      <div style="width:28px;height:28px;background:${isUrgent ? '#ff4d4d' : '#7c6af7'};border-radius:7px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;">${isUrgent ? '🚨' : '⚡'}</div>
      <span style="font-size:16px;font-weight:700;color:#e8e8f0;">GENZ Sales OS</span>
    </div>
    <p style="margin:12px 0 2px;font-size:18px;font-weight:700;color:#e8e8f0;">${checkpoint}:00 Check-in · ${name}</p>
    <p style="margin:0;color:#666680;font-size:12px;">${dateStr}</p>
  </div>

  <div style="background:#13131a;border:1px solid ${isUrgent ? '#ff4d4d40' : '#2a2a3a'};border-radius:12px;padding:20px;margin-bottom:20px;">
    <p style="margin:0 0 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#666680;">Today's Progress</p>
    <table style="width:100%;border-collapse:collapse;">
      ${metricRow('Companies', companies, targetCompanies)}
      ${metricRow('Outreach', outreach, targetOutreach)}
      ${metricRow('Meetings', meetings, targetMeetings)}
    </table>
  </div>

  <div style="background:${isUrgent ? '#1a0a0a' : '#0d1a12'};border:1px solid ${isUrgent ? '#ff4d4d30' : '#3ecf8e20'};border-radius:10px;padding:16px;margin-bottom:20px;">
    <p style="margin:0;font-size:14px;line-height:1.6;color:${isUrgent ? '#ff9999' : '#7de8b2'};">${bodyText.replace(/\n/g, '<br>')}</p>
  </div>

  <div style="text-align:center;padding-top:16px;border-top:1px solid #2a2a3a;">
    <p style="color:#666680;font-size:11px;margin:0;">GENZ Sales OS · ${checkpoint}:00 Progress Check · Auto-sent Mon–Fri</p>
  </div>
</div>
</body>
</html>`
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const checkpoint = parseInt(url.searchParams.get('checkpoint') ?? '14')
  if (![11, 14, 16].includes(checkpoint)) {
    return NextResponse.json({ error: 'checkpoint must be 11, 14, or 16' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const resend = new Resend(resendKey)

  const today = new Date().toISOString().split('T')[0]
  const wStart = weekStart()
  const paceThreshold = PACE[checkpoint]

  // Fetch templates
  const { data: templates } = await supabase
    .from('notification_templates')
    .select('*')
  const tplMap = Object.fromEntries((templates || []).map(t => [t.tier, t]))

  // Fetch all sales users with goals
  const { data: salesUsers } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'sales_user')
    .not('email', 'is', null)

  if (!salesUsers || salesUsers.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No sales users' })
  }

  const { data: allTargets } = await supabase.from('goal_targets').select('*')
  const { data: allLeads } = await supabase
    .from('leads')
    .select('id, owner_id, created_at')
    .gte('created_at', `${today}T00:00:00`)
  const { data: todayActivities } = await supabase
    .from('activities')
    .select('id, owner_id')
    .in('type', ['Called', 'Messaged'])
    .gte('created_at', `${today}T00:00:00`)
  const { data: todayCalEvents } = await supabase
    .from('calendar_events')
    .select('id, created_by')
    .eq('date', today)

  const results: string[] = []

  for (const user of salesUsers) {
    if (!user.email) continue

    const targets = (allTargets || []).find(t => t.user_id === user.id)
    const tComp = targets?.daily_companies ?? 12
    const tOut  = targets?.daily_outreach  ?? 10
    const tMeet = targets?.daily_meetings  ?? 1

    const companies = (allLeads || []).filter(l => l.owner_id === user.id).length
    const outreach  = (todayActivities || []).filter(a => a.owner_id === user.id).length
    const meetings  = (todayCalEvents || []).filter(e => e.created_by === user.id).length

    const compPct = tComp > 0 ? companies / tComp : 1
    const outPct  = tOut  > 0 ? outreach  / tOut  : 1
    const meetPct = tMeet > 0 ? meetings  / tMeet : 1

    const anyBehind = compPct < paceThreshold || outPct < paceThreshold || meetPct < paceThreshold
    const tier = !anyBehind ? 'on_pace' : checkpoint === 16 ? 'critical' : 'behind'

    const tpl = tplMap[tier]
    if (!tpl) continue

    const vars = {
      time: `${checkpoint}:00`,
      summary: `${companies}/${tComp} co, ${outreach}/${tOut} out, ${meetings}/${tMeet} mtg`,
      companies, outreach, meetings,
      target_companies: tComp, target_outreach: tOut, target_meetings: tMeet,
    }

    const subject = fillTemplate(tpl.subject, vars)
    const bodyText = fillTemplate(tpl.body, vars)
    const name = user.full_name || user.email.split('@')[0]

    try {
      await resend.emails.send({
        from: 'GENZ Sales OS <digest@gen-z.digital>',
        to: user.email,
        subject,
        html: buildHtml(name, checkpoint, companies, tComp, outreach, tOut, meetings, tMeet, bodyText, tier !== 'on_pace'),
      })
      results.push(`✓ ${user.email} [${tier}]`)
    } catch (err) {
      results.push(`✗ ${user.email}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ checkpoint, sent: results.length, results })
}
