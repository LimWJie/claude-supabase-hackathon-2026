import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.ts'

/** Returns the current session, signing in anonymously if there isn't one. */
export function useAnonymousSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) return
      const { error } = await supabase.auth.signInAnonymously()
      if (error) setError(error.message)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return { session, error }
}
