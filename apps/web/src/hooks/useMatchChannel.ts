import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
  matchTopic,
  type MatchEventName,
  type MatchEvents,
  type PlayerPresence,
} from '@game/shared'
import { supabase } from '../lib/supabase.ts'

export type MatchEventHandlers = {
  [E in MatchEventName]?: (payload: MatchEvents[E]) => void
}

const EVENT_NAMES: MatchEventName[] = ['sync']

/**
 * Joins the private `match:<id>` channel: tracks `me` in Presence, exposes
 * who is online, and sends/receives typed Broadcast events.
 */
export function useMatchChannel(
  matchId: string,
  me: PlayerPresence | null,
  handlers: MatchEventHandlers,
) {
  const [players, setPlayers] = useState<PlayerPresence[]>([])
  const [connected, setConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const handlersRef = useRef(handlers)
  useLayoutEffect(() => {
    handlersRef.current = handlers
  })

  const userId = me?.userId
  const seat = me?.seat
  const displayName = me?.displayName

  useEffect(() => {
    if (!userId || !seat || !displayName) return

    const channel = supabase.channel(matchTopic(matchId), {
      config: { private: true, presence: { key: userId } },
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PlayerPresence>()
      setPlayers(Object.values(state).map((entries) => entries[0]))
    })

    for (const event of EVENT_NAMES) {
      channel.on('broadcast', { event }, ({ payload }) => {
        const handler = handlersRef.current[event] as ((p: unknown) => void) | undefined
        handler?.(payload)
      })
    }

    supabase.realtime.setAuth().then(() => {
      channel.subscribe(async (status) => {
        setConnected(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId,
            seat,
            displayName,
            onlineAt: new Date().toISOString(),
          } satisfies PlayerPresence)
        }
      })
    })

    channelRef.current = channel
    return () => {
      channelRef.current = null
      setConnected(false)
      supabase.removeChannel(channel)
    }
  }, [matchId, userId, seat, displayName])

  const send = useCallback(<E extends MatchEventName>(event: E, payload: MatchEvents[E]) => {
    return channelRef.current?.send({ type: 'broadcast', event, payload })
  }, [])

  return { players, connected, send }
}
