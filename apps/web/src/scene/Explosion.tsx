import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, type Mesh, type MeshBasicMaterial, type PointLight } from 'three'
import { Burst } from './Burst.tsx'

const FIRE = ['#fff3b0', '#ffb703', '#fb5607', '#ff006e']
const SMOKE = ['#3a3f58', '#555b78']

/** Fireball, smoke, a light flash and an expanding shockwave ring. */
export function Explosion({ position }: { position: [number, number, number] }) {
  const light = useRef<PointLight>(null)
  const ring = useRef<Mesh>(null)
  const ringMaterial = useRef<MeshBasicMaterial>(null)
  const age = useRef(0)

  useFrame((_, dt) => {
    age.current += dt
    const t = age.current
    if (light.current) light.current.intensity = Math.max(0, 120 * (1 - t / 0.8))
    if (ring.current && ringMaterial.current) {
      ring.current.scale.setScalar(1 + t * 14)
      ringMaterial.current.opacity = Math.max(0, 0.8 - t)
    }
  })

  return (
    <group>
      <pointLight ref={light} position={[position[0], position[1], position[2] + 2]} color="#ff8a3d" distance={30} />
      <mesh ref={ring} position={[position[0], position[1], position[2] + 0.5]}>
        <ringGeometry args={[0.4, 0.55, 64]} />
        <meshBasicMaterial ref={ringMaterial} color="#ffd166" transparent side={DoubleSide} depthWrite={false} />
      </mesh>
      <Burst position={position} colors={FIRE} count={320} speed={10} size={0.32} life={1.6} gravity={-2} />
      <Burst position={position} colors={SMOKE} count={120} speed={3} size={0.6} life={2.6} gravity={1} additive={false} />
    </group>
  )
}
