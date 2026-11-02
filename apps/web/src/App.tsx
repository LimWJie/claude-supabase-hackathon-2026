import { useState } from 'react'
import { useAnonymousSession } from './hooks/useAnonymousSession.ts'
import { Lobby } from './components/Lobby.tsx'
import { MatchView } from './components/MatchView.tsx'
import { MuteButton } from './components/MuteButton.tsx'

function App() {
  const { session, error } = useAnonymousSession()
  const [matchId, setMatchId] = useState<string | null>(null)

  return (
    <>
      {!session ? (
        <div className="hud center">
          <p className="loading">{error ? `Sign-in failed: ${error}` : 'Loading…'}</p>
        </div>
      ) : matchId ? (
        <MatchView matchId={matchId} userId={session.user.id} onLeave={() => setMatchId(null)} />
      ) : (
        <Lobby onEnter={setMatchId} />
      )}
      <div className="corner">
        <MuteButton />
      </div>
    </>
  )
}

export default App
