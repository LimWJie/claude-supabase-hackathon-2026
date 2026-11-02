import { useCallback, useEffect, useState } from 'react'
import type { MatchRow } from '@game/shared'
import { supabase } from '../lib/supabase.ts'

export type Match = MatchRow

/**
 * Loads a match row and keeps it in sync via Postgres Changes. `applyUpdate`
 * lets faster sources (Broadcast, RPC results) feed in rows too; the newest
 * `updated_at` wins.
 */
export function useMatch(matchId: string) {
  const [match, setMatch] = useState<Match | null>(null)

  const applyUpdate = useCallback((next: Match) => {
    setMatch((prev) => (prev && prev.updated_at > next.updated_at ? prev : next))
  }, [])

  useEffect(() => {
    let cancelled = false

    supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) applyUpdate(data)
      })

    const channel = supabase
      .channel(`db:matches:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => applyUpdate(payload.new as Match),
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [matchId, applyUpdate])

  return { match, applyUpdate }
}
