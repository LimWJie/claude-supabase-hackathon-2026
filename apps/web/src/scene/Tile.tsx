import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { RoundedBox, Text } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Color, MathUtils, type Group, type MeshStandardMaterial } from 'three'
import { sfx } from '../lib/sfx.ts'
import { tilePosition } from './layout.ts'
import { BOMB_COLOR, OUT_COLOR, SEAT_COLORS, liveHue } from './palette.ts'

export type TileStatus = 'idle' | 'live' | 'out' | 'host' | 'guest' | 'bomb'

interface TileProps {
  n: number
  status: TileStatus
  interactive: boolean
  onPick?: (n: number) => void
}

function tileColor(n: number, status: TileStatus) {
  switch (status) {
    case 'out':
      return new Color(OUT_COLOR)
    case 'host':
    case 'guest':
      return new Color(SEAT_COLORS[status])
    case 'bomb':
      return new Color(BOMB_COLOR)
    default:
      return new Color().setHSL(liveHue(n), 0.85, 0.55)
  }
}

export const Tile = memo(function Tile({ n, status, interactive, onPick }: TileProps) {
  const group = useRef<Group>(null)
  const material = useRef<MeshStandardMaterial>(null)
  const [hovered, setHovered] = useState(false)
  const [x, y] = tilePosition(n)
  const color = useMemo(() => tileColor(n, status), [n, status])
  const active = interactive && status === 'live'
  const lifted = hovered && active

  useEffect(() => {
    if (!lifted) return
    document.body.style.cursor = 'pointer'
    return () => {
      document.body.style.cursor = ''
    }
  }, [lifted])

  useFrame((state, dt) => {
    const g = group.current
    const m = material.current
    if (!g || !m) return
    const t = state.clock.elapsedTime

    let z = 0
    let scale = 1
    let glow = 0.25
    let wobble = 0
    switch (status) {
      case 'idle':
        z = Math.sin(t * 1.6 - (x + y) * 0.5) * 0.35
        break
      case 'live':
        z = Math.sin(t * 2 + n * 0.7) * 0.06
        glow = 0.35
        if (lifted) {
          z += 0.7
          scale = 1.15
          glow = 1
        }
        break
      case 'out':
        z = -1.4
        scale = 0.78
        glow = 0
        break
      case 'host':
      case 'guest':
        z = -0.6
        scale = 0.9
        glow = 0.6
        break
      case 'bomb':
        z = 1 + Math.sin(t * 30) * 0.05
        scale = 1.3 + Math.sin(t * 8) * 0.08
        glow = 2.2
        wobble = Math.sin(t * 40) * 0.08
        break
    }

    g.position.z = MathUtils.damp(g.position.z, z, 6, dt)
    g.scale.setScalar(MathUtils.damp(g.scale.x, scale, 8, dt))
    g.rotation.z = status === 'bomb' ? wobble : MathUtils.damp(g.rotation.z, 0, 8, dt)
    const k = 1 - Math.exp(-6 * dt)
    m.color.lerp(color, k)
    m.emissive.lerp(color, k)
    m.emissiveIntensity = MathUtils.damp(m.emissiveIntensity, glow, 6, dt)
  })

  function over(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    setHovered(true)
    if (active) sfx.hover()
  }

  function out() {
    setHovered(false)
  }

  function click(e: ThreeEvent<MouseEvent>) {
    if (!active) return
    e.stopPropagation()
    onPick?.(n)
  }

  return (
    <group ref={group} position={[x, y, 0]}>
      <RoundedBox
        args={[1, 1, 0.5]}
        radius={0.14}
        smoothness={4}
        onPointerOver={over}
        onPointerOut={out}
        onClick={click}
      >
        <meshStandardMaterial
          ref={material}
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          roughness={0.35}
          metalness={0.2}
        />
      </RoundedBox>
      <Text
        position={[0, 0, 0.27]}
        fontSize={0.42}
        color={status === 'out' ? '#59607a' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={status === 'out' ? 0 : 0.02}
        outlineColor="#0b0c1a"
      >
        {n}
      </Text>
    </group>
  )
})
