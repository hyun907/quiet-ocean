// 하늘 — 그라데이션 + 태양/달이 그려지는 셰이더 돔
import * as THREE from 'three'
import skyVert from '../shaders/sky.vert.glsl?raw'
import skyFrag from '../shaders/sky.frag.glsl?raw'

export class Sky {
  readonly mesh: THREE.Mesh
  readonly uniforms: Record<string, THREE.IUniform>

  constructor() {
    this.uniforms = {
      uZenithColor: { value: new THREE.Color(0x2f74c9) },
      uHorizonColor: { value: new THREE.Color(0xb9d8ee) },
      uSunDir: { value: new THREE.Vector3(0, 0.8, -0.6).normalize() },
      uSunColor: { value: new THREE.Color(0xffffff) },
      uMoonDir: { value: new THREE.Vector3(0, 0.5, -0.8).normalize() },
      uNightFactor: { value: 0 },
    }

    const geometry = new THREE.SphereGeometry(900, 48, 32)
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,  // 돔 안쪽에서 보는 면
      depthWrite: false,
    })

    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.renderOrder = -1 // 가장 먼저 그려서 배경 역할
  }

  addTo(scene: THREE.Scene): void {
    scene.add(this.mesh)
  }
}
