// 카메라 — 해안가 바로 앞, 수면 위 낮은 시점
import * as THREE from 'three'

/** 해안선(z=+150)에서 30 유닛 떨어진 바다 위, 눈높이 정도의 낮은 시점 */
export const CAMERA_POSITION = new THREE.Vector3(0, 3.5, 120)

export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    58,
    window.innerWidth / window.innerHeight,
    0.1,
    2000,
  )
  camera.position.copy(CAMERA_POSITION)
  camera.rotation.order = 'YXZ' // yaw → pitch 순서로 회전 (1인칭 시점 표준)
  return camera
}
