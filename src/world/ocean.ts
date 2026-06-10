// 바다 — shader 기반으로 움직이는 수면 + 해안선 뒤의 젖은 모래 평면
import * as THREE from 'three'
import oceanVert from '../shaders/ocean.vert.glsl?raw'
import oceanFrag from '../shaders/ocean.frag.glsl?raw'

/** 해안선의 월드 z 좌표 — 카메라(z=120) 뒤쪽에 물가가 있다 */
export const SHORE_Z = 150

export class Ocean {
  readonly mesh: THREE.Mesh
  readonly sand: THREE.Mesh
  readonly uniforms: Record<string, THREE.IUniform>

  constructor(isMobile: boolean) {
    this.uniforms = {
      uTime: { value: 0 },
      uWaveIntensity: { value: 1.0 },
      uShoreZ: { value: SHORE_Z },
      uSunDir: { value: new THREE.Vector3(0, 0.8, -0.6).normalize() },
      uSunColor: { value: new THREE.Color(0xffffff) },
      uSunIntensity: { value: 1.5 },
      uDeepColor: { value: new THREE.Color(0x0b4a74) },
      uShallowColor: { value: new THREE.Color(0x3fa3b5) },
      uZenithColor: { value: new THREE.Color(0x2f74c9) },
      uHorizonColor: { value: new THREE.Color(0xb9d8ee) },
      uFogColor: { value: new THREE.Color(0xbcd8ec) },
      uFogNear: { value: 80 },
      uFogFar: { value: 650 },
      uNightFactor: { value: 0 },
    }

    // 모바일은 격자 밀도를 절반으로 낮춰 정점 셰이더 부담을 줄인다
    const segX = isMobile ? 256 : 512
    const segZ = isMobile ? 160 : 320
    const geometry = new THREE.PlaneGeometry(1600, 1000, segX, segZ)
    geometry.rotateX(-Math.PI / 2)

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: oceanVert,
      fragmentShader: oceanFrag,
    })

    this.mesh = new THREE.Mesh(geometry, material)
    // z 범위: -840(먼바다) ~ +160(물가 너머)
    this.mesh.position.set(0, 0, -340)

    // 해안선 뒤 젖은 모래 — 뒤돌아봤을 때 물가가 자연스럽게 보이도록
    const sandGeo = new THREE.PlaneGeometry(1600, 300)
    sandGeo.rotateX(-Math.PI / 2)
    const sandMat = new THREE.MeshBasicMaterial({ color: 0x71604c })
    this.sand = new THREE.Mesh(sandGeo, sandMat)
    this.sand.position.set(0, -0.6, SHORE_Z + 150)
  }

  addTo(scene: THREE.Scene): void {
    scene.add(this.mesh)
    scene.add(this.sand)
  }

  setWaveIntensity(v: number): void {
    this.uniforms.uWaveIntensity.value = v
  }

  update(elapsed: number): void {
    this.uniforms.uTime.value = elapsed
  }
}
