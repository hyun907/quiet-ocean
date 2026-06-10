// WebGL 렌더러 생성 — 톤매핑/픽셀비율 등 공통 설정을 한곳에서 관리
import * as THREE from 'three'

export function createRenderer(canvas: HTMLCanvasElement, isMobile: boolean): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  // 모바일에서는 픽셀비율을 낮춰 성능 확보
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2))
  // 차분하고 영화적인 톤을 위한 ACES Filmic 톤매핑 (노출은 시간대에 따라 갱신)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  return renderer
}
