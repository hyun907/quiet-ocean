// 파도 효과음
// - public/audio/waves.mp3 가 있으면 그것을 루프 재생
// - 없으면 WebAudio로 합성한 파도 소리(저역 브라운 노이즈 + 느린 스웰)로 폴백
// - 브라우저 자동재생 정책 때문에 첫 사용자 클릭(unlock) 이후에만 소리를 낸다

const VOLUME = 0.5

export class OceanAudio {
  private audioEl: HTMLAudioElement
  private fileFailed = false
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private enabled = true   // UI 토글 상태 (기본: 켜짐)
  private unlocked = false // 사용자가 화면을 클릭했는지

  constructor() {
    this.audioEl = new Audio(`${import.meta.env.BASE_URL}audio/waves.mp3`)
    this.audioEl.loop = true
    this.audioEl.volume = VOLUME
    this.audioEl.preload = 'auto'
    this.audioEl.addEventListener('error', () => {
      this.fileFailed = true
    })
  }

  /** 첫 사용자 제스처에서 호출 — 이때부터 실제 재생 가능 */
  unlock(): void {
    if (this.unlocked) return
    this.unlocked = true
    if (this.enabled) this.start()
  }

  /** UI 토글 */
  setEnabled(on: boolean): void {
    this.enabled = on
    if (!this.unlocked) return
    if (on) this.start()
    else this.stop()
  }

  private start(): void {
    if (this.fileFailed) {
      this.startSynth()
      return
    }
    // 파일이 있으면 mp3 재생, 재생 불가(파일 없음 등)면 합성음으로 폴백
    this.audioEl.play().catch(() => {
      this.fileFailed = true
      this.startSynth()
    })
  }

  private stop(): void {
    this.audioEl.pause()
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4)
      window.setTimeout(() => void this.ctx?.suspend(), 1200)
    }
  }

  // ---- WebAudio 합성 파도 소리 ----
  private startSynth(): void {
    if (this.ctx) {
      void this.ctx.resume()
      this.master?.gain.setTargetAtTime(VOLUME, this.ctx.currentTime, 1.2)
      return
    }

    const ctx = new AudioContext()
    this.ctx = ctx

    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    this.master = master

    // 브라운 노이즈 버퍼 — 묵직하고 부드러운 바다 배경음의 원천
    const seconds = 6
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }

    // 레이어를 만드는 헬퍼: 노이즈 → 필터 → 게인(스웰 LFO로 변조) → 마스터
    const makeLayer = (
      filterType: BiquadFilterType,
      freq: number,
      baseGain: number,
      lfoFreq: number,
      lfoDepth: number,
    ) => {
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.loop = true
      // 레이어마다 재생 속도를 살짝 달리해 루프가 티 나지 않게
      src.playbackRate.value = 0.85 + Math.random() * 0.3

      const filter = ctx.createBiquadFilter()
      filter.type = filterType
      filter.frequency.value = freq

      const gain = ctx.createGain()
      gain.gain.value = baseGain

      // 느린 사인 LFO 가 게인을 흔들어 "철썩… 철썩…" 하는 스웰을 만든다
      const lfo = ctx.createOscillator()
      lfo.frequency.value = lfoFreq
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = lfoDepth
      lfo.connect(lfoGain)
      lfoGain.connect(gain.gain)

      src.connect(filter)
      filter.connect(gain)
      gain.connect(master)
      src.start()
      lfo.start()
    }

    // 깊은 배경 럼블 + 해안에 부서지는 중역의 "쏴아" 레이어 두 개
    makeLayer('lowpass', 420, 0.5, 0.07, 0.28)
    makeLayer('bandpass', 950, 0.22, 0.11, 0.16)
    makeLayer('bandpass', 1600, 0.1, 0.05, 0.07)

    master.gain.setTargetAtTime(VOLUME, ctx.currentTime, 1.5)
  }
}
