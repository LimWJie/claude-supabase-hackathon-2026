import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'

/** Gentle pointer parallax, fits the board to the viewport, and shakes on demand. */
export function CameraRig({ shake }: { shake: number }) {
  const { camera, size } = useThree()
  const shakeLeft = useRef(0)
  const base = useRef({ x: 0, y: -3, z: 16 })

  useEffect(() => {
    if (shake > 0) shakeLeft.current = 0.9
  }, [shake])

  useFrame((state, dt) => {
    const aspect = size.width / size.height
    const b = base.current
    b.x = MathUtils.damp(b.x, state.pointer.x * 1.2, 3, dt)
    b.y = MathUtils.damp(b.y, -3 + state.pointer.y * 0.8, 3, dt)
    b.z = MathUtils.damp(b.z, Math.max(16, 15 / aspect), 3, dt)

    shakeLeft.current = Math.max(0, shakeLeft.current - dt)
    const k = shakeLeft.current ** 2 * 1.4
    camera.position.set(
      b.x + (Math.random() - 0.5) * k,
      b.y + (Math.random() - 0.5) * k,
      b.z,
    )
    camera.lookAt(0, 0, 0)
  })

  return null
}
