// 진입점 — 모든 모듈을 조립하고 렌더 루프를 돌린다
import * as THREE from 'three'
import { createRenderer } from './core/renderer'
import { createCamera } from './core/camera'
import { LookControls } from './core/controls'
import { Ocean } from './world/ocean'
import { Sky } from './world/sky'
import { createLighting } from './world/lighting'

// 모바일(터치 기기) 감지 — 셰이더 격자/픽셀비율 품질을 낮춘다
const isMobile = window.matchMedia('(pointer: coarse)').matches

const canvas = document.getElementById('scene') as HTMLCanvasElement
const renderer = createRenderer(canvas, isMobile)
const camera = createCamera()
const controls = new LookControls(camera, canvas)

const scene = new THREE.Scene()
scene.fog = new THREE.Fog(0xbcd8ec, 80, 650) // 모래 평면 등 표준 머티리얼용 안개

const sky = new Sky()
sky.addTo(scene)

const ocean = new Ocean(isMobile)
ocean.addTo(scene)

createLighting(scene)

// ---- 렌더 루프 ----
const clock = new THREE.Clock()

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1) // 탭 복귀 시 점프 방지
  const elapsed = clock.elapsedTime

  controls.update(dt)
  ocean.update(elapsed)

  renderer.render(scene, camera)
})

// ---- 리사이즈 ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
