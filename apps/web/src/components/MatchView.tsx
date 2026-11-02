import { useMemo, useState, type FormEvent } from 'react'
import { otherSeat, type GameState, type PlayerPresence, type PlayerSeat } from '@game/shared'
import { supabase } from '../lib/supabase.ts'
import { useMatch } from '../hooks/useMatch.ts'
import { useMatchChannel } from '../hooks/useMatchChannel.ts'
import { RangeBar } from './RangeBar.tsx'

interface Props {
  matchId: string
  userId: string
  onLeave: () => void
}

export function MatchView({ matchId, userId, onLeave }: Props) {
  const { match, applyUpdate } = useMatch(matchId)
  const [guess, setGuess] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const hostId = match?.host_id
  const me = useMemo<PlayerPresence | null>(() => {
    if (!hostId) return null
    return {
      userId,
      seat: hostId === userId ? 'host' : 'guest',
      displayName: `Player-${userId.slice(0, 4)}`,
      onlineAt: '',
    }
  }, [hostId, userId])

  const { players, connected, send } = useMatchChannel(matchId, me, {
    sync: ({ match }) => applyUpdate(match),
  })

  if (!match || !me) return <p>Loading match…</p>

  const state = match.state as GameState
  const mySeat = me.seat
  const myTurn = match.status === 'active' && state.turn === mySeat
  const online = (seat: PlayerSeat) => players.some((p) => p.seat === seat)
  const forced = state.low === state.high

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.rpc('make_guess', {
      match_id: matchId,
      guess: Number(guess),
    })
    setBusy(false)
    if (error) return setError(error.message)
    setGuess('')
    applyUpdate(data)
    send('sync', { match: data })
  }

  return (
    <section className="card">
      <header className="row spread">
        <h2>
          Match <code>{match.code}</code>
        </h2>
        <span className={`badge ${match.status}`}>{match.status}</span>
      </header>

      <div className="players">
        {(['host', 'guest'] as const).map((seat) => (
          <div
            key={seat}
            className={`player ${match.status === 'active' && state.turn === seat ? 'turn' : ''}`}
          >
            <span className={`dot ${online(seat) ? 'on' : ''}`} />
            {seat === mySeat ? 'You' : 'Opponent'}
            <small>{seat}</small>
          </div>
        ))}
      </div>

      {match.status === 'waiting' && (
        <p className="notice">
          Waiting for an opponent. Share the code <code>{match.code}</code>.
        </p>
      )}

      {match.status !== 'waiting' && (
        <>
          <RangeBar low={state.low} high={state.high} mystery={state.mystery} />

          {match.status === 'active' && (
            <form onSubmit={submit} className="row">
              <input
                type="number"
                inputMode="numeric"
                min={state.low}
                max={state.high}
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder={`${state.low}–${state.high}`}
                disabled={!myTurn || busy}
                autoFocus
              />
              <button type="submit" disabled={!myTurn || busy || guess === ''}>
                Guess
              </button>
              <span className="muted">
                {myTurn
                  ? forced
                    ? 'Only one number left… 💣'
                    : 'Your turn — avoid the mystery number!'
                  : "Opponent's turn"}
              </span>
            </form>
          )}

          {match.status === 'finished' && (
            <p className={`result ${state.loser === mySeat ? 'lose' : 'win'}`}>
              {state.loser === mySeat ? '💥 You hit it. You lose!' : '🎉 Your opponent hit it. You win!'}{' '}
              The mystery number was <b>{state.mystery}</b>.
            </p>
          )}

          {error && <p className="error">{error}</p>}

          {state.guesses.length > 0 && (
            <ol className="history">
              {state.guesses.map((g, i) => (
                <li key={i} className={g.value === state.mystery ? 'boom' : ''}>
                  <span>{g.seat === mySeat ? 'You' : 'Opponent'}</span>
                  <b>{g.value}</b>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <div className="row spread">
        <small className="muted">
          {connected ? 'Live' : 'Connecting…'} · opponent {online(otherSeat(mySeat)) ? 'online' : 'offline'}
        </small>
        <button onClick={onLeave}>{match.status === 'finished' ? 'Back to lobby' : 'Leave'}</button>
      </div>
    </section>
  )
}
