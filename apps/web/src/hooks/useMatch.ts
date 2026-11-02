import { useCallback, useEffect, useState } from 'react'
import type { MatchRow } from '@game/shared'
import { supabase } from '../lib/supabase.ts'

export type Match = MatchRow

/**
 * Loads a match row and keeps it in sync via Postgres Changes. `applyUpdate`
 * lets faster sources (Broadcast, RPC results) feed in rows too; the newest
 * `updated_at` wins. `refresh` refetches, for when an update may have been
 * missed (e.g. it happened before the subscription was live).
 */
export function useMatch(matchId: string) {
  const [match, setMatch] = useState<Match | null>(null)

  const applyUpdate = useCallback((next: Match) => {
    setMatch((prev) => (prev && prev.updated_at > next.updated_at ? prev : next))
  }, [])

  const refresh = useCallback(() => {
    supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()
      .then(({ data }) => {
        if (data) applyUpdate(data)
      })
  }, [matchId, applyUpdate])

  useEffect(() => {
    refresh()

    const channel = supabase
      .channel(`db:matches:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => applyUpdate(payload.new as Match),
      )
      // Changes only stream once Postgres confirms the subscription; anything
      // committed before that (e.g. a fast opponent joining) is caught here.
      .on('system', {}, (payload: { extension?: string; status?: string }) => {
        if (payload.extension === 'postgres_changes' && payload.status === 'ok') refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, applyUpdate, refresh])

  return { match, applyUpdate, refresh }
}
