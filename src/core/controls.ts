// 마우스/터치 드래그 시야 컨트롤
// - 감쇠(damping)로 부드럽게 따라오는 회전
// - 상하 각도 제한으로 과도한 회전 방지
// - 휠 줌: FOV를 부드럽게 조절 (선택 기능)
import * as THREE from 'three'

const ROTATE_SPEED = 0.0026
const PITCH_MIN = -0.38 // 아래로 내려다보는 한계 (rad)
const PITCH_MAX = 0.5   // 위로 올려다보는 한계 (rad)
const FOV_MIN = 38
const FOV_MAX = 70
const DAMPING = 5.5     // 클수록 빨리 따라옴

export class LookControls {
  private yaw = 0
  private pitch = 0.04
  private targetYaw = 0
  private targetPitch = 0.04
  private targetFov: number
  private dragging = false
  private lastX = 0
  private lastY = 0

  constructor(
    private camera: THREE.PerspectiveCamera,
    dom: HTMLElement,
  ) {
    this.targetFov = camera.fov

    dom.addEventListener('pointerdown', (e) => {
      this.dragging = true
      this.lastX = e.clientX
      this.lastY = e.clientY
      dom.setPointerCapture(e.pointerId)
    })
    dom.addEventListener('pointermove', (e) => {
      if (!this.dragging) return
      const dx = e.clientX - this.lastX
      const dy = e.clientY - this.lastY
      this.lastX = e.clientX
      this.lastY = e.clientY
      // "세상을 잡고 끄는" 방식: 오른쪽으로 끌면 시선은 왼쪽으로
      this.targetYaw += dx * ROTATE_SPEED
      this.targetPitch = THREE.MathUtils.clamp(
        this.targetPitch + dy * ROTATE_SPEED,
        PITCH_MIN,
        PITCH_MAX,
      )
    })
    const endDrag = () => (this.dragging = false)
    dom.addEventListener('pointerup', endDrag)
    dom.addEventListener('pointercancel', endDrag)

    // 휠로 FOV 줌 — 자연스러운 망원/광각 느낌
    dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        this.targetFov = THREE.MathUtils.clamp(
          this.targetFov + e.deltaY * 0.02,
          FOV_MIN,
          FOV_MAX,
        )
      },
      { passive: false },
    )
  }

  /** 매 프레임 호출 — 목표값을 향해 지수 감쇠로 부드럽게 수렴 */
  update(dt: number): void {
    const k = 1 - Math.exp(-DAMPING * dt)
    this.yaw += (this.targetYaw - this.yaw) * k
    this.pitch += (this.targetPitch - this.pitch) * k
    this.camera.rotation.y = this.yaw
    this.camera.rotation.x = this.pitch

    if (Math.abs(this.camera.fov - this.targetFov) > 0.01) {
      this.camera.fov += (this.targetFov - this.camera.fov) * k
      this.camera.updateProjectionMatrix()
    }
  }
}
