import { useState } from 'react'
import { useAnonymousSession } from './hooks/useAnonymousSession.ts'
import { Lobby } from './components/Lobby.tsx'
import { MatchView } from './components/MatchView.tsx'

function App() {
  const { session, error } = useAnonymousSession()
  const [matchId, setMatchId] = useState<string | null>(null)

  return (
    <main>
      <h1>Mystery Number</h1>
      <p className="muted">Take turns guessing 1–100. Whoever hits the mystery number loses.</p>
      {error && <p className="error">Sign-in failed: {error}</p>}
      {!session ? (
        <p>Signing in…</p>
      ) : matchId ? (
        <MatchView matchId={matchId} userId={session.user.id} onLeave={() => setMatchId(null)} />
      ) : (
        <Lobby onEnter={setMatchId} />
      )}
    </main>
  )
}

export default App
