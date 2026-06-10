// 별 — 하늘 돔 안쪽 상반구에 흩뿌린 포인트. 밤(nightFactor)에만 서서히 나타난다.
import * as THREE from 'three'
import starsVert from '../shaders/stars.vert.glsl?raw'
import starsFrag from '../shaders/stars.frag.glsl?raw'

export class Stars {
  readonly points: THREE.Points
  readonly uniforms: Record<string, THREE.IUniform>

  constructor(isMobile: boolean) {
    const count = isMobile ? 700 : 1400
    const radius = 850 // 하늘 돔(900)보다 살짝 안쪽

    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // 상반구에 균등 분포 (수평선 근처는 피해서 살짝 위로)
      const theta = Math.random() * Math.PI * 2
      const y = 0.06 + Math.random() * 0.94 // sin(고도)
      const r = Math.sqrt(1 - y * y)
      positions[i * 3 + 0] = Math.cos(theta) * r * radius
      positions[i * 3 + 1] = y * radius
      positions[i * 3 + 2] = Math.sin(theta) * r * radius
      sizes[i] = 0.8 + Math.random() * 1.8
      phases[i] = Math.random() * Math.PI * 2
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

    this.uniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    }

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: starsVert,
      fragmentShader: starsFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.points = new THREE.Points(geometry, material)
  }

  addTo(scene: THREE.Scene): void {
    scene.add(this.points)
  }

  /** nightFactor(0~1)에 따라 서서히 나타나고, 시간으로 깜빡인다 */
  update(elapsed: number, nightFactor: number): void {
    this.uniforms.uTime.value = elapsed
    this.uniforms.uOpacity.value = nightFactor
  }
}
