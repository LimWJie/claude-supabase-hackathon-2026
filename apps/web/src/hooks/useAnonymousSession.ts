import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase.ts'
import { ensureSession } from '../lib/auth.ts'

/** Returns the current session, signing in anonymously if there isn't one. */
export function useAnonymousSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const signIn = () =>
      ensureSession().catch((e: Error) => setError(e.message))

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      // A stored session whose refresh failed gets signed out; start a fresh one
      // instead of leaving the app stuck (or sending requests as `anon`).
      if (event === 'SIGNED_OUT') void signIn()
    })

    void signIn()

    return () => sub.subscription.unsubscribe()
  }, [])

  return { session, error }
}
