import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, Color, type Points, type PointsMaterial } from 'three'

type Shape = 'sphere' | 'rain'

interface BurstProps {
  position: [number, number, number]
  /** Keep this array stable (module constant); a new array restarts the burst. */
  colors: string[]
  count?: number
  speed?: number
  size?: number
  life?: number
  gravity?: number
  /** Initial spread: 'sphere' explodes outwards, 'rain' falls from above. */
  shape?: Shape
  additive?: boolean
}

function createParticles(count: number, speed: number, shape: Shape, colors: string[]) {
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  const vertexColors = new Float32Array(count * 3)
  const palette = colors.map((c) => new Color(c))
  for (let i = 0; i < count; i++) {
    if (shape === 'rain') {
      positions[i * 3] = (Math.random() - 0.5) * 16
      positions[i * 3 + 1] = 7 + Math.random() * 6
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4
      velocities[i * 3] = (Math.random() - 0.5) * 1.5
      velocities[i * 3 + 1] = -Math.random() * speed
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5
    } else {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const v = speed * (0.3 + Math.random() * 0.7)
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * v
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * v
      velocities[i * 3 + 2] = Math.abs(Math.cos(phi)) * v
    }
    const c = palette[i % palette.length]
    vertexColors.set([c.r, c.g, c.b], i * 3)
  }
  return { positions, velocities, vertexColors }
}

/** One-shot particle burst. Remount (change `key`) to fire again. */
export function Burst({
  position,
  colors,
  count = 80,
  speed = 4,
  size = 0.18,
  life = 1.4,
  gravity = -4,
  shape = 'sphere',
  additive = true,
}: BurstProps) {
  const points = useRef<Points>(null)
  const material = useRef<PointsMaterial>(null)
  const velocities = useRef<Float32Array | null>(null)
  const age = useRef(0)

  useLayoutEffect(() => {
    const p = points.current
    if (!p) return
    const data = createParticles(count, speed, shape, colors)
    p.geometry.setAttribute('position', new BufferAttribute(data.positions, 3))
    p.geometry.setAttribute('color', new BufferAttribute(data.vertexColors, 3))
    velocities.current = data.velocities
    age.current = 0
  }, [colors, count, shape, speed])

  useFrame((_, dt) => {
    const p = points.current
    const m = material.current
    const v = velocities.current
    if (!p || !m || !v) return
    age.current += dt
    const remaining = Math.max(0, 1 - age.current / life)
    p.visible = remaining > 0
    if (!p.visible) return
    const attribute = p.geometry.getAttribute('position') as BufferAttribute
    const pos = attribute.array as Float32Array
    for (let i = 0; i < count; i++) {
      v[i * 3 + 1] += gravity * dt
      pos[i * 3] += v[i * 3] * dt
      pos[i * 3 + 1] += v[i * 3 + 1] * dt
      pos[i * 3 + 2] += v[i * 3 + 2] * dt
    }
    attribute.needsUpdate = true
    m.opacity = remaining
  })

  return (
    <points ref={points} position={position} frustumCulled={false}>
      <bufferGeometry />
      <pointsMaterial
        ref={material}
        size={size}
        vertexColors
        transparent
        depthWrite={false}
        blending={additive ? AdditiveBlending : undefined}
      />
    </points>
  )
}
