// 장면 조명 — 수면/하늘은 셰이더에서 자체 라이팅하지만,
// 표준 머티리얼(모래 등)과 향후 오브젝트 추가를 위해 씬 조명을 유지한다.
import * as THREE from 'three'

export interface Lighting {
  sun: THREE.DirectionalLight
  hemi: THREE.HemisphereLight
}

export function createLighting(scene: THREE.Scene): Lighting {
  const sun = new THREE.DirectionalLight(0xffffff, 1.2)
  sun.position.set(0, 100, -100)
  scene.add(sun)

  const hemi = new THREE.HemisphereLight(0xbcd8ec, 0x1a2f44, 0.5)
  scene.add(hemi)

  return { sun, hemi }
}
