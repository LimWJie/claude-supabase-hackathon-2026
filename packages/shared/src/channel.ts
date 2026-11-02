// Contract for the private Realtime channel `match:<matchId>`.

import type { Database } from './database.types.ts'
import type { PlayerSeat } from './game.ts'

export type MatchRow = Database['public']['Tables']['matches']['Row']

export const matchTopic = (matchId: string) => `match:${matchId}`

/** Broadcast events, keyed by event name. */
export interface MatchEvents {
  /** Sent right after a successful make_guess so the opponent updates instantly. */
  sync: { match: MatchRow }
}

export type MatchEventName = keyof MatchEvents

/** What each client tracks on the channel's Presence. */
export interface PlayerPresence {
  userId: string
  seat: PlayerSeat
  displayName: string
  onlineAt: string
}
