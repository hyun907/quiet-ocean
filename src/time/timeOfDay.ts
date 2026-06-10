// 시간대 시스템
// t ∈ [0, 1) 을 새벽 → 아침 → 낮 → 노을 → 밤 → (다시 새벽) 으로 순환시키며,
// 키프레임 팔레트를 부드럽게 보간해 하늘/바다/조명/안개 색을 결정한다.
import * as THREE from 'three'

export interface Palette {
  skyZenith: THREE.Color    // 하늘 천정 색
  skyHorizon: THREE.Color   // 수평선 색
  sunColor: THREE.Color     // 태양(밤에는 달빛) 색
  sunIntensity: number      // 수면 하이라이트 강도
  seaDeep: THREE.Color      // 깊은 바다 색
  seaShallow: THREE.Color   // 얕은 바다 색
  fogColor: THREE.Color     // 안개 색 (수평선과 어울리게)
  nightFactor: number       // 0 낮 ~ 1 밤 (별/달 표시량)
  exposure: number          // 톤매핑 노출
  sunElevation: number      // 태양 고도 (deg, 음수면 수평선 아래)
  sunAzimuth: number        // 태양 방위 (deg, 0 = 정면 -z)
}

interface Keyframe {
  t: number
  skyZenith: number
  skyHorizon: number
  sunColor: number
  sunIntensity: number
  seaDeep: number
  seaShallow: number
  fogColor: number
  nightFactor: number
  exposure: number
  sunElevation: number
  sunAzimuth: number
}

// 각 시간대의 분위기를 정의하는 키프레임 (마지막은 t=1에서 새벽으로 순환)
const KEYFRAMES: Keyframe[] = [
  { // 새벽 — 푸른 어스름에 떠오르기 직전의 분홍빛
    t: 0.0,
    skyZenith: 0x2a3550, skyHorizon: 0xc98a74,
    sunColor: 0xffb27d, sunIntensity: 1.0,
    seaDeep: 0x14283c, seaShallow: 0x4a6878,
    fogColor: 0xc28d7c, nightFactor: 0.2, exposure: 0.95,
    sunElevation: 3, sunAzimuth: -55,
  },
  { // 아침 — 맑고 투명한 빛
    t: 0.25,
    skyZenith: 0x4f87c4, skyHorizon: 0xcfe2ec,
    sunColor: 0xfff3da, sunIntensity: 1.4,
    seaDeep: 0x10405e, seaShallow: 0x4f9eae,
    fogColor: 0xc9dde9, nightFactor: 0, exposure: 1.05,
    sunElevation: 28, sunAzimuth: -28,
  },
  { // 낮 — 높은 태양, 가장 푸른 바다
    t: 0.5,
    skyZenith: 0x2f74c9, skyHorizon: 0xb9d8ee,
    sunColor: 0xffffff, sunIntensity: 1.6,
    seaDeep: 0x0b4a74, seaShallow: 0x3fa3b5,
    fogColor: 0xbcd8ec, nightFactor: 0, exposure: 1.1,
    sunElevation: 62, sunAzimuth: 0,
  },
  { // 노을 — 따뜻한 오렌지/핑크 하늘과 반짝이는 수면
    t: 0.75,
    skyZenith: 0x3e3268, skyHorizon: 0xff8e5a,
    sunColor: 0xff6b2e, sunIntensity: 1.5,
    seaDeep: 0x1c2c49, seaShallow: 0x7c6470,
    fogColor: 0xe09267, nightFactor: 0.05, exposure: 1.0,
    sunElevation: 5, sunAzimuth: 32,
  },
  { // 밤 — 어두운 바다, 은은한 달빛, 별
    t: 0.92,
    skyZenith: 0x040a16, skyHorizon: 0x132238,
    sunColor: 0xa9c6ee, sunIntensity: 0.5,
    seaDeep: 0x050f1c, seaShallow: 0x0c2335,
    fogColor: 0x0f1c2e, nightFactor: 1, exposure: 0.85,
    sunElevation: -18, sunAzimuth: 55,
  },
]

/** 달 방향 — 밤하늘에 고정된 위치 (고도 38°, 방위 -35°) */
export const MOON_DIR = directionFromAngles(38, -35)

function directionFromAngles(elevationDeg: number, azimuthDeg: number): THREE.Vector3 {
  const el = THREE.MathUtils.degToRad(elevationDeg)
  const az = THREE.MathUtils.degToRad(azimuthDeg)
  // 방위 0° = 카메라 기본 시선 방향(-z)
  return new THREE.Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    -Math.cos(az) * Math.cos(el),
  ).normalize()
}

/** 보간 결과를 담을 Palette 객체 생성 (매 프레임 재사용해 GC 방지) */
export function createPalette(): Palette {
  return {
    skyZenith: new THREE.Color(),
    skyHorizon: new THREE.Color(),
    sunColor: new THREE.Color(),
    sunIntensity: 1,
    seaDeep: new THREE.Color(),
    seaShallow: new THREE.Color(),
    fogColor: new THREE.Color(),
    nightFactor: 0,
    exposure: 1,
    sunElevation: 30,
    sunAzimuth: 0,
  }
}

const _colorA = new THREE.Color()
const _colorB = new THREE.Color()

function lerpColor(target: THREE.Color, hexA: number, hexB: number, u: number): void {
  target.copy(_colorA.setHex(hexA)).lerp(_colorB.setHex(hexB), u)
}

/** t ∈ [0,1) 에 해당하는 팔레트를 out에 채운다 */
export function samplePalette(t: number, out: Palette): Palette {
  t = ((t % 1) + 1) % 1

  // 현재 t가 속한 키프레임 구간 탐색 (마지막 구간은 새벽으로 순환)
  let a = KEYFRAMES[KEYFRAMES.length - 1]
  let b = KEYFRAMES[0]
  let span = 1 - a.t
  let local = t >= a.t ? t - a.t : 0
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (t >= KEYFRAMES[i].t && t < KEYFRAMES[i + 1].t) {
      a = KEYFRAMES[i]
      b = KEYFRAMES[i + 1]
      span = b.t - a.t
      local = t - a.t
      break
    }
  }

  // smoothstep 이징으로 구간 경계에서도 변화가 매끄럽게
  const u0 = span > 0 ? local / span : 0
  const u = u0 * u0 * (3 - 2 * u0)

  lerpColor(out.skyZenith, a.skyZenith, b.skyZenith, u)
  lerpColor(out.skyHorizon, a.skyHorizon, b.skyHorizon, u)
  lerpColor(out.sunColor, a.sunColor, b.sunColor, u)
  lerpColor(out.seaDeep, a.seaDeep, b.seaDeep, u)
  lerpColor(out.seaShallow, a.seaShallow, b.seaShallow, u)
  lerpColor(out.fogColor, a.fogColor, b.fogColor, u)
  out.sunIntensity = THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, u)
  out.nightFactor = THREE.MathUtils.lerp(a.nightFactor, b.nightFactor, u)
  out.exposure = THREE.MathUtils.lerp(a.exposure, b.exposure, u)
  out.sunElevation = THREE.MathUtils.lerp(a.sunElevation, b.sunElevation, u)
  out.sunAzimuth = THREE.MathUtils.lerp(a.sunAzimuth, b.sunAzimuth, u)
  return out
}

/** 팔레트의 태양 고도/방위를 방향 벡터로 변환해 out에 채운다 */
export function getSunDirection(palette: Palette, out: THREE.Vector3): THREE.Vector3 {
  const dir = directionFromAngles(palette.sunElevation, palette.sunAzimuth)
  return out.copy(dir)
}

// ---- 실제 시각(한국 기준) → 장면 시간 t 매핑 ----
// 시계 시각(시 단위)과 장면 t의 대응점. 새벽 5시 = t 0, 낮 1시 = t 0.5 …
// 마지막 앵커(29시 = 다음날 5시)로 하루가 순환한다.
const CLOCK_ANCHORS: { hour: number; t: number }[] = [
  { hour: 5, t: 0 },     // 새벽
  { hour: 9, t: 0.25 },  // 아침
  { hour: 13, t: 0.5 },  // 낮
  { hour: 19, t: 0.75 }, // 노을
  { hour: 22.5, t: 0.92 }, // 밤
  { hour: 29, t: 1 },    // 다음날 새벽으로 순환
]

/** 현재 한국 시각(KST, UTC+9 고정 — 서머타임 없음)을 0~24 시 단위로 반환 */
function kstHourOfDay(date: Date): number {
  const kst = new Date(date.getTime() + 9 * 3600 * 1000)
  return kst.getUTCHours() + kst.getUTCMinutes() / 60 + kst.getUTCSeconds() / 3600
}

/** 실제 한국 시각에 해당하는 장면 시간 t ∈ [0,1) 를 반환 */
export function timeFromClock(date: Date = new Date()): number {
  let h = kstHourOfDay(date)
  if (h < CLOCK_ANCHORS[0].hour) h += 24 // 0~5시는 전날 밤의 연장으로 취급

  for (let i = 0; i < CLOCK_ANCHORS.length - 1; i++) {
    const a = CLOCK_ANCHORS[i]
    const b = CLOCK_ANCHORS[i + 1]
    if (h >= a.hour && h <= b.hour) {
      const u = (h - a.hour) / (b.hour - a.hour)
      return (a.t + (b.t - a.t) * u) % 1
    }
  }
  return 0
}

/** UI 표시용 시간대 이름 */
export function timeLabel(t: number): string {
  t = ((t % 1) + 1) % 1
  if (t < 0.13) return '새벽'
  if (t < 0.38) return '아침'
  if (t < 0.63) return '낮'
  if (t < 0.86) return '노을'
  if (t < 0.97) return '밤'
  return '새벽'
}
