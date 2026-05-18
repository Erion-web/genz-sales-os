import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const { event_id, attendee_ids } = await req.json()
    if (!event_id || !Array.isArray(attendee_ids) || attendee_ids.length === 0) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const [{ data: event }, { data: inviter }, { data: attendees }] = await Promise.all([
      admin.from('calendar_events').select('title, date, time, description, lead_id, leads(name)').eq('id', event_id).single(),
      admin.from('profiles').select('full_name').eq('id', user.id).single(),
      admin.from('profiles').select('id, email, full_name').in('id', attendee_ids),
    ])

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'Email not configured' }, { status: 500 })

    const resend = new Resend(resendKey)
    const inviterName = (inviter as any)?.full_name || 'A teammate'
    const dateStr = new Date((event as any).date).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    const leadName = (event as any).leads?.name ?? null

    await Promise.allSettled(
      ((attendees as any[]) || [])
        .filter(a => a.email)
        .map(a =>
          resend.emails.send({
            from: 'GENZ Sales OS <digest@gen-z.digital>',
            to: a.email,
            subject: `📅 You've been invited: ${(event as any).title}`,
            html: buildInviteHtml(
              a.full_name || 'there',
              inviterName,
              (event as any).title,
              dateStr,
              (event as any).time,
              (event as any).description,
              leadName,
            ),
          })
        )
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Calendar invite error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function buildInviteHtml(
  name: string,
  inviterName: string,
  title: string,
  date: string,
  time: string | null,
  description: string | null,
  leadName: string | null,
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:sans-serif;color:#e8e8f0;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;gap:10px;background:#13131a;border:1px solid #2a2a3a;border-radius:12px;padding:12px 20px;">
        <div style="width:32px;height:32px;background:#7c6af7;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:16px;">⚡</div>
        <span style="font-size:18px;font-weight:700;color:#e8e8f0;">GENZ Sales OS</span>
      </div>
    </div>

    <div style="background:#13131a;border:1px solid #2a2a3a;border-radius:12px;padding:24px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#666680;">Hi ${name},</p>
      <h2 style="margin:8px 0 16px;font-size:20px;color:#e8e8f0;">${inviterName} invited you to a meeting</h2>
      <div style="background:#1c1c27;border-radius:8px;padding:16px;border:1px solid #2a2a3a;">
        <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#e8e8f0;">📅 ${title}</p>
        <p style="margin:0 0 6px;font-size:13px;color:#a0a0b8;"><span style="color:#666680;">Date:</span> ${date}</p>
        ${time ? `<p style="margin:0 0 6px;font-size:13px;color:#a0a0b8;"><span style="color:#666680;">Time:</span> ${time}</p>` : ''}
        ${leadName ? `<p style="margin:0 0 6px;font-size:13px;color:#a0a0b8;"><span style="color:#666680;">Lead:</span> ${leadName}</p>` : ''}
        ${description ? `<p style="margin:8px 0 0;font-size:13px;color:#a0a0b8;">${description}</p>` : ''}
      </div>
    </div>

    <div style="text-align:center;padding-top:20px;border-top:1px solid #2a2a3a;">
      <p style="color:#666680;font-size:11px;margin:0;">GENZ Sales OS · Calendar Invitation</p>
    </div>
  </div>
</body>
</html>`
}
