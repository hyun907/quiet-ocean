// 물 잔물결용 노멀맵을 절차적으로 생성한다 (외부 텍스처 에셋 불필요).
// 정수 주파수 사인파만 합성하므로 이음매 없이 완벽하게 타일링된다.
// 밉맵 + 이방성 필터링 덕분에 value noise 방식보다 멀리서도 깨끗하다.
import * as THREE from 'three'

interface WaveComponent {
  kx: number    // 정수 주파수 (타일링 보장)
  ky: number
  amp: number
  phase: number
}

export function generateWaterNormalMap(size = 256, anisotropy = 1): THREE.DataTexture {
  // 시드 고정 LCG — 매번 같은 노멀맵이 나와 결과가 재현 가능하다
  let seed = 1234567
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0xffffffff
  }

  // 주파수가 높을수록 진폭이 작아지는 사인파 묶음 (물결 스펙트럼 근사)
  const waves: WaveComponent[] = []
  for (let i = 0; i < 56; i++) {
    const f = 2 + rand() * 15
    const ang = rand() * Math.PI * 2
    let kx = Math.round(Math.cos(ang) * f)
    let ky = Math.round(Math.sin(ang) * f)
    if (kx === 0 && ky === 0) kx = 1
    const fr = Math.hypot(kx, ky)
    waves.push({ kx, ky, amp: 1 / Math.pow(fr, 1.25), phase: rand() * Math.PI * 2 })
  }

  const data = new Uint8Array(size * size * 4)
  const TWO_PI = Math.PI * 2
  const strength = 0.22 // 법선 기울기 세기

  for (let y = 0; y < size; y++) {
    const v = y / size
    for (let x = 0; x < size; x++) {
      const u = x / size

      // 높이장의 편미분을 해석적으로 누적
      let dhdx = 0
      let dhdy = 0
      for (const w of waves) {
        const c = Math.cos(TWO_PI * (w.kx * u + w.ky * v) + w.phase) * w.amp
        dhdx += c * w.kx
        dhdy += c * w.ky
      }

      // 탄젠트 공간 법선 (z가 위): normalize(-s·∂h/∂x, -s·∂h/∂y, 1)
      const nx = -dhdx * strength
      const ny = -dhdy * strength
      const inv = 1 / Math.hypot(nx, ny, 1)

      const i = (y * size + x) * 4
      data[i + 0] = Math.round((nx * inv * 0.5 + 0.5) * 255)
      data[i + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255)
      data[i + 2] = Math.round((1 * inv * 0.5 + 0.5) * 255)
      data[i + 3] = 255
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = anisotropy // 비스듬히 볼 때(수면!) 선명도를 크게 좌우
  texture.needsUpdate = true
  return texture
}
