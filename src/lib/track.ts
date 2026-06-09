import { createClient } from '@/lib/supabase/client'

// Fire-and-forget. Never awaited — never blocks UI.
export function track(event: string, label: string, meta?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const supabase = createClient()
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session?.user) return
    void supabase.from('user_activity_log').insert({
      user_id: session.user.id,
      event,
      label,
      path: window.location.pathname,
      meta: meta ?? {},
    })
  })
}
