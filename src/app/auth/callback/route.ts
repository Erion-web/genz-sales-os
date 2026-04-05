import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // exchangeCodeForSession returns the user directly — use it instead of
    // calling getUser() again, which can fail before the session cookie is flushed.
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const user = data.user
      const meta = user.user_metadata ?? {}

      // Resolve name: Google sends `full_name` or `name` or `given_name`+`family_name`
      const full_name =
        meta.full_name ||
        meta.name ||
        (meta.given_name
          ? `${meta.given_name}${meta.family_name ? ' ' + meta.family_name : ''}`
          : null) ||
        user.email?.split('@')[0] ||
        null

      // Resolve avatar: Supabase normalises Google's `picture` → `avatar_url`
      const avatar_url = meta.avatar_url || meta.picture || null

      // Upsert so both new and returning users always have fresh Google data
      await supabase.from('profiles').upsert(
        { id: user.id, email: user.email, full_name, avatar_url },
        { onConflict: 'id' }
      )

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
