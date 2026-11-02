import { lazy, Suspense } from 'react'
import type { GameSceneProps } from './GameScene.tsx'

// three.js is the bulk of the bundle; load it after the HUD paints.
const GameScene = lazy(() => import('./GameScene.tsx'))

export function Scene(props: GameSceneProps) {
  return (
    <div className="stage">
      <Suspense fallback={null}>
        <GameScene {...props} />
      </Suspense>
    </div>
  )
}
