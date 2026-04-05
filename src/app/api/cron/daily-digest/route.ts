import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { Lead, getDealValue, formatCurrency } from '@/types'

// This route is called by a cron job every day at 09:00
// On Vercel: set up via vercel.json cron
// Manually: POST /api/cron/daily-digest   (with Authorization: Bearer CRON_SECRET)

const CC_EMAIL = 'erion@gen-z.digital'

function buildEmailHtml(
  name: string,
  overdue: Lead[],
  dueToday: Lead[],
  meetings: { lead: Lead; slot: string; date: string; time: string | null }[],
  pipelineValue: number,
  closedValue: number
): string {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const leadRow = (l: Lead) => `
    <tr style="border-bottom:1px solid #2a2a3a;">
      <td style="padding:8px 12px;color:#e8e8f0;font-size:13px;">${l.name}${l.company ? ` <span style="color:#666680;">· ${l.company}</span>` : ''}</td>
      <td style="padding:8px 12px;color:#a0a0b8;font-size:12px;">${l.stage}</td>
      <td style="padding:8px 12px;color:#3ecf8e;font-size:12px;font-family:monospace;">${getDealValue(l) > 0 ? formatCurrency(getDealValue(l)) : '—'}</td>
      <td style="padding:8px 12px;font-size:12px;">
        ${l.phone ? `<a href="tel:${l.phone}" style="color:#4d9fff;text-decoration:none;">📞 ${l.phone}</a>` : ''}
      </td>
    </tr>`

  const section = (title: string, color: string, emoji: string, rows: Lead[]) =>
    rows.length === 0 ? '' : `
    <div style="margin-bottom:28px;">
      <h3 style="margin:0 0 10px;font-size:14px;color:${color};font-family:sans-serif;">
        ${emoji} ${title} (${rows.length})
      </h3>
      <table style="width:100%;border-collapse:collapse;background:#13131a;border-radius:8px;overflow:hidden;border:1px solid #2a2a3a;">
        <thead>
          <tr style="background:#1c1c27;">
            <th style="padding:8px 12px;text-align:left;color:#666680;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Lead</th>
            <th style="padding:8px 12px;text-align:left;color:#666680;font-size:11px;text-transform:uppercase;">Stage</th>
            <th style="padding:8px 12px;text-align:left;color:#666680;font-size:11px;text-transform:uppercase;">Value</th>
            <th style="padding:8px 12px;text-align:left;color:#666680;font-size:11px;text-transform:uppercase;">Contact</th>
          </tr>
        </thead>
        <tbody>${rows.map(leadRow).join('')}</tbody>
      </table>
    </div>`

  const meetingSection = meetings.length === 0 ? '' : `
    <div style="margin-bottom:28px;">
      <h3 style="margin:0 0 10px;font-size:14px;color:#4d9fff;font-family:sans-serif;">📅 Today's Meetings (${meetings.length})</h3>
      <table style="width:100%;border-collapse:collapse;background:#13131a;border-radius:8px;overflow:hidden;border:1px solid #2a2a3a;">
        <tbody>
          ${meetings.map(m => `
            <tr style="border-bottom:1px solid #2a2a3a;">
              <td style="padding:8px 12px;color:#e8e8f0;font-size:13px;">${m.lead.name}</td>
              <td style="padding:8px 12px;color:#a0a0b8;font-size:12px;">${m.slot}</td>
              <td style="padding:8px 12px;color:#4d9fff;font-size:12px;">${m.date}${m.time ? ' at ' + m.time : ''}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'DM Mono',monospace,sans-serif;color:#e8e8f0;">
  <div style="max-width:680px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:10px;background:#13131a;border:1px solid #2a2a3a;border-radius:12px;padding:12px 20px;">
        <div style="width:32px;height:32px;background:#7c6af7;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;">⚡</div>
        <span style="font-size:18px;font-weight:700;font-family:sans-serif;color:#e8e8f0;">GENZ Sales OS</span>
      </div>
      <h2 style="margin:16px 0 4px;font-family:sans-serif;font-size:20px;color:#e8e8f0;">Good morning, ${name}! 👋</h2>
      <p style="margin:0;color:#666680;font-size:13px;">${dateStr}</p>
    </div>

    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px;">
      <div style="background:#13131a;border:1px solid #2a2a3a;border-radius:10px;padding:16px;">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#666680;">Pipeline Value</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#4d9fff;font-family:sans-serif;">${formatCurrency(pipelineValue)}</p>
      </div>
      <div style="background:#13131a;border:1px solid #2a2a3a;border-radius:10px;padding:16px;">
        <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#666680;">Total Closed</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:#3ecf8e;font-family:sans-serif;">${formatCurrency(closedValue)}</p>
      </div>
    </div>

    ${overdue.length === 0 && dueToday.length === 0 && meetings.length === 0
      ? '<div style="text-align:center;padding:32px;background:#13131a;border-radius:12px;border:1px solid #2a2a3a;margin-bottom:28px;"><p style="font-size:24px;margin:0 0 8px;">✅</p><p style="color:#3ecf8e;margin:0;font-family:sans-serif;font-weight:600;">All clear! No overdue or due-today leads.</p></div>'
      : ''}

    ${section('Overdue Follow-ups', '#ff4d4d', '🚨', overdue)}
    ${section('Due Today', '#f5a623', '📌', dueToday)}
    ${meetingSection}

    <!-- Footer -->
    <div style="text-align:center;padding-top:24px;border-top:1px solid #2a2a3a;">
      <p style="color:#666680;font-size:11px;margin:0;">GENZ Sales OS · Daily Digest · Sent automatically at 09:00</p>
    </div>
  </div>
</body>
</html>`
}

export async function GET(request: Request) {
  // Verify cron secret so only authorized callers can trigger this
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })
  }

  // Use service-role key server-side to bypass RLS for reading all users
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const resend = new Resend(resendKey)
  const today = new Date().toISOString().split('T')[0]
  const results: string[] = []

  // Get all profiles with emails
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .not('email', 'is', null)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No profiles found' })
  }

  // Get all leads
  const { data: allLeads } = await supabase.from('leads').select('*')
  const leads = (allLeads || []) as Lead[]

  for (const profile of profiles) {
    if (!profile.email) continue

    const myLeads = leads.filter(l => l.owner_id === profile.id)
    const overdue = myLeads.filter(l =>
      l.next_followup < today && !['Closed', 'Dead'].includes(l.stage)
    )
    const dueToday = myLeads.filter(l =>
      l.next_followup === today && !['Closed', 'Dead'].includes(l.stage)
    )

    // Today's meetings across all this user's leads
    const todayMeetings: { lead: Lead; slot: string; date: string; time: string | null }[] = []
    myLeads.forEach(l => {
      const slots: Record<string, string> = {
        meeting1: 'First Meeting', meeting2: 'Second Meeting', meeting3: 'Closing Meeting',
      }
      Object.entries(l.meetings || {}).forEach(([slot, m]) => {
        if (m?.date === today) {
          todayMeetings.push({ lead: l, slot: slots[slot], date: m.date, time: m.time })
        }
      })
    })

    const pipelineValue = myLeads
      .filter(l => !['Closed', 'Dead'].includes(l.stage))
      .reduce((sum, l) => sum + getDealValue(l), 0)
    const closedValue = myLeads
      .filter(l => l.stage === 'Closed')
      .reduce((sum, l) => sum + getDealValue(l), 0)

    const name = profile.full_name || profile.email.split('@')[0]

    try {
      await resend.emails.send({
        from: 'GENZ Sales OS <digest@gen-z.digital>',
        to: profile.email,
        cc: profile.email !== CC_EMAIL ? CC_EMAIL : undefined,
        subject: `🎯 Daily Digest — ${overdue.length} overdue, ${dueToday.length} due today · ${new Date().toLocaleDateString('en-GB')}`,
        html: buildEmailHtml(name, overdue, dueToday, todayMeetings, pipelineValue, closedValue),
      })
      results.push(`✓ ${profile.email}`)
    } catch (err: unknown) {
      results.push(`✗ ${profile.email}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ sent: profiles.length, results })
}
