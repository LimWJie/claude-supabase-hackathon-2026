import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import { MAX_NUMBER, MIN_NUMBER, type Guess } from '@game/shared'
import { Burst } from './Burst.tsx'
import { CameraRig } from './CameraRig.tsx'
import { Explosion } from './Explosion.tsx'
import { tilePosition } from './layout.ts'
import { SEAT_COLORS } from './palette.ts'
import { Tile, type TileStatus } from './Tile.tsx'

export interface GameSceneProps {
  /** `idle` animates the board as a backdrop (lobby). */
  mode: 'idle' | 'play'
  low?: number
  high?: number
  guesses?: Guess[]
  mystery?: number
  interactive?: boolean
  onPick?: (n: number) => void
  celebrate?: boolean
}

const NUMBERS = Array.from({ length: MAX_NUMBER - MIN_NUMBER + 1 }, (_, i) => MIN_NUMBER + i)
const HOST_COLORS = [SEAT_COLORS.host, '#ffffff']
const GUEST_COLORS = [SEAT_COLORS.guest, '#ffffff']
const CONFETTI = ['#22d3ee', '#f472b6', '#facc15', '#4ade80', '#a78bfa', '#ffffff']

export default function GameScene({
  mode,
  low = MIN_NUMBER,
  high = MAX_NUMBER,
  guesses = [],
  mystery,
  interactive = false,
  onPick,
  celebrate = false,
}: GameSceneProps) {
  const guessedBy = useMemo(() => new Map(guesses.map((g) => [g.value, g.seat])), [guesses])
  const last = guesses.at(-1)

  function statusOf(n: number): TileStatus {
    if (mode === 'idle') return 'idle'
    if (n === mystery) return 'bomb'
    const seat = guessedBy.get(n)
    if (seat) return seat
    return n >= low && n <= high ? 'live' : 'out'
  }

  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 50, position: [0, -2, 22] }}>
      <color attach="background" args={['#070814']} />
      <fog attach="fog" args={['#070814', 24, 50]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, -6, 10]} intensity={1.2} />
      <pointLight position={[-8, 6, 6]} intensity={60} color="#7c3aed" />
      <pointLight position={[8, -6, 6]} intensity={60} color="#06b6d4" />

      <Stars radius={60} depth={40} count={2500} factor={4} fade speed={1} />
      <Sparkles count={60} scale={[16, 14, 6]} size={3} speed={0.3} opacity={0.5} color="#a5b4fc" />

      <group rotation={mode === 'idle' ? [0, 0, -0.08] : [0, 0, 0]}>
        {NUMBERS.map((n) => (
          <Tile key={n} n={n} status={statusOf(n)} interactive={interactive} onPick={onPick} />
        ))}

        {last && last.value !== mystery && (
          <Burst
            key={`guess-${guesses.length}`}
            position={tilePosition(last.value)}
            colors={last.seat === 'host' ? HOST_COLORS : GUEST_COLORS}
            count={60}
            speed={5}
            life={1}
          />
        )}

        {mystery !== undefined && <Explosion key={`boom-${mystery}`} position={tilePosition(mystery)} />}
      </group>

      {celebrate && (
        <Burst
          key="confetti"
          position={[0, 0, 2]}
          colors={CONFETTI}
          count={400}
          speed={3}
          size={0.22}
          life={5}
          gravity={-0.6}
          shape="rain"
          additive={false}
        />
      )}

      <CameraRig shake={mystery ?? 0} />
    </Canvas>
  )
}
