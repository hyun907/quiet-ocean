// 진입점 — 모든 모듈을 조립하고 렌더 루프를 돌린다
import * as THREE from 'three'
import './ui/style.css'
import { createRenderer } from './core/renderer'
import { createCamera } from './core/camera'
import { LookControls } from './core/controls'
import { Ocean } from './world/ocean'
import { Sky } from './world/sky'
import { Stars } from './world/stars'
import { createLighting } from './world/lighting'
import {
  createPalette,
  samplePalette,
  getSunDirection,
  timeFromClock,
  MOON_DIR,
} from './time/timeOfDay'
import { createPanel } from './ui/panel'
import { OceanAudio } from './audio/oceanAudio'
import { createComposer } from './post/composer'

// 모바일(터치 기기) 감지 — 셰이더 격자/픽셀비율 품질을 낮춘다
const isMobile = window.matchMedia('(pointer: coarse)').matches

const canvas = document.getElementById('scene') as HTMLCanvasElement
const renderer = createRenderer(canvas, isMobile)
const camera = createCamera()
const controls = new LookControls(camera, canvas)

const scene = new THREE.Scene()
const fog = new THREE.Fog(0xbcd8ec, 80, 650) // 모래 평면 등 표준 머티리얼용 안개
scene.fog = fog

const sky = new Sky()
sky.addTo(scene)

const ocean = new Ocean(isMobile, renderer.capabilities.getMaxAnisotropy())
ocean.addTo(scene)

const stars = new Stars(isMobile)
stars.addTo(scene)

const lighting = createLighting(scene)

// 하늘 환경 큐브맵 — 실제 하늘(태양 글로우/그라데이션/달)을 수면 반사에 쓴다.
// HalfFloat로 만들어 태양의 HDR 밝기가 반사에서 클램핑되지 않게 한다.
const envRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType })
const envCamera = new THREE.CubeCamera(1, 1500, envRT)
envCamera.position.copy(camera.position)
ocean.uniforms.uEnvMap.value = envRT.texture

/** 하늘만 큐브맵에 다시 굽는다 — 시간대가 바뀔 때마다 호출 */
function updateEnvMap(): void {
  ocean.mesh.visible = false
  ocean.sand.visible = false
  envCamera.update(renderer, scene)
  ocean.mesh.visible = true
  ocean.sand.visible = true
}

// 포스트프로세싱: bloom(데스크톱) + 비네트 + ACES 톤매핑
const composer = createComposer(renderer, scene, camera, isMobile)

// ---- 상태 ----
const state = {
  time: timeFromClock(), // 접속한 실제 한국 시각에 맞는 시간대로 시작
  waveIntensity: 1.0,
  autoTime: false,
  followClock: true, // 슬라이더를 만지기 전까지는 실제 시각을 따라간다
}

/** 자동 흐름일 때 하루가 한 바퀴 도는 시간 (초) */
const DAY_CYCLE_SECONDS = 240

// ---- 시간대 팔레트 적용 ----
const palette = createPalette()
const sunDir = new THREE.Vector3()
const lightDir = new THREE.Vector3()
const sandBase = new THREE.Color(0x71604c)
const sandColor = new THREE.Color()

function applyEnvironment(t: number): void {
  samplePalette(t, palette)

  // 태양 방향 — 하늘에는 실제 태양을, 수면 반사에는 밤이 되면 달을 쓴다
  getSunDirection(palette, sunDir)
  lightDir.lerpVectors(sunDir, MOON_DIR, palette.nightFactor).normalize()

  // 바다
  const ou = ocean.uniforms
  ;(ou.uSunDir.value as THREE.Vector3).copy(lightDir)
  ;(ou.uSunColor.value as THREE.Color).copy(palette.sunColor)
  ou.uSunIntensity.value = palette.sunIntensity
  ;(ou.uDeepColor.value as THREE.Color).copy(palette.seaDeep)
  ;(ou.uShallowColor.value as THREE.Color).copy(palette.seaShallow)
  ;(ou.uZenithColor.value as THREE.Color).copy(palette.skyZenith)
  ;(ou.uHorizonColor.value as THREE.Color).copy(palette.skyHorizon)
  ;(ou.uFogColor.value as THREE.Color).copy(palette.fogColor)
  ou.uNightFactor.value = palette.nightFactor

  // 하늘
  const su = sky.uniforms
  ;(su.uZenithColor.value as THREE.Color).copy(palette.skyZenith)
  ;(su.uHorizonColor.value as THREE.Color).copy(palette.skyHorizon)
  ;(su.uSunDir.value as THREE.Vector3).copy(sunDir)
  ;(su.uSunColor.value as THREE.Color).copy(palette.sunColor)
  ;(su.uMoonDir.value as THREE.Vector3).copy(MOON_DIR)
  su.uNightFactor.value = palette.nightFactor

  // 안개 / 조명 / 노출
  fog.color.copy(palette.fogColor)
  lighting.sun.color.copy(palette.sunColor)
  lighting.sun.intensity = Math.max(palette.sunIntensity, 0.15)
  lighting.sun.position.copy(lightDir).multiplyScalar(200)
  lighting.hemi.color.copy(palette.skyHorizon)
  renderer.toneMappingExposure = palette.exposure

  // 젖은 모래: 안개색이 섞이고 밤에는 어두워진다
  sandColor.copy(sandBase).lerp(palette.fogColor, 0.35)
  sandColor.multiplyScalar(1 - 0.75 * palette.nightFactor)
  ;(ocean.sand.material as THREE.MeshBasicMaterial).color.copy(sandColor)

  // 바뀐 하늘을 반사 큐브맵에 반영
  updateEnvMap()
}

applyEnvironment(state.time)

// ---- 오디오 ----
const audio = new OceanAudio()

// ---- UI ----
const panel = createPanel({
  initialTime: state.time,
  initialWave: state.waveIntensity,
  initialSound: true,
  initialAuto: state.autoTime,
  onTimeChange: (t) => {
    state.followClock = false // 사용자가 직접 시간을 고르면 실시간 추적 해제
    state.time = t
    applyEnvironment(t)
  },
  onWaveChange: (v) => {
    state.waveIntensity = v
    ocean.setWaveIntensity(v)
  },
  onSoundToggle: (on) => audio.setEnabled(on),
  onAutoToggle: (on) => {
    state.autoTime = on
    if (on) state.followClock = false // 빠른 자동 순환이 실시간 추적보다 우선
  },
})

// 실시간 추적: 30초마다 실제 한국 시각에 맞춰 장면 시간을 갱신
window.setInterval(() => {
  if (!state.followClock || state.autoTime) return
  state.time = timeFromClock()
  applyEnvironment(state.time)
  panel.setTime(state.time)
}, 30_000)

// 첫 안내 문구 — 첫 클릭에 사라지면서 오디오를 잠금 해제한다
const hint = document.createElement('div')
hint.className = 'hint'
hint.textContent = '드래그로 주변을 둘러보세요 · 화면을 클릭하면 파도 소리가 시작됩니다'
document.body.appendChild(hint)

window.addEventListener(
  'pointerdown',
  () => {
    audio.unlock() // 자동재생 정책: 사용자 제스처 이후에만 재생 가능
    hint.classList.add('hidden')
  },
  { once: true },
)

// ---- 렌더 루프 ----
let prevMs = performance.now()
let elapsed = 0

renderer.setAnimationLoop(() => {
  const nowMs = performance.now()
  const dt = Math.min((nowMs - prevMs) / 1000, 0.1) // 탭 복귀 시 점프 방지
  prevMs = nowMs
  elapsed += dt

  // 자동 시간 흐름 — 슬라이더도 함께 따라간다
  if (state.autoTime) {
    state.time = (state.time + dt / DAY_CYCLE_SECONDS) % 1
    applyEnvironment(state.time)
    panel.setTime(state.time)
  }

  controls.update(dt)
  ocean.update(elapsed)
  stars.update(elapsed, palette.nightFactor)

  composer.render()
})

// ---- 리사이즈 ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})
