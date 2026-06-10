// 컨트롤 패널 UI — 시간대/파도 세기 슬라이더 (글래스모피즘 스타일)
import { timeLabel } from '../time/timeOfDay'

export interface PanelOptions {
  initialTime: number
  initialWave: number
  initialSound: boolean
  initialAuto: boolean
  onTimeChange: (t: number) => void
  onWaveChange: (v: number) => void
  onSoundToggle: (on: boolean) => void
  onAutoToggle: (on: boolean) => void
}

export interface PanelApi {
  /** 자동 시간 흐름 등 외부에서 시간이 바뀔 때 슬라이더를 동기화 */
  setTime: (t: number) => void
}

export function createPanel(opts: PanelOptions): PanelApi {
  const panel = document.createElement('div')
  panel.className = 'panel'
  panel.innerHTML = `
    <div class="panel-title">QUIET OCEAN</div>

    <label>시간 <span class="value" data-time-label></span></label>
    <input type="range" class="time-slider" data-time min="0" max="1" step="0.001" />
    <div class="ticks"><span>새벽</span><span>아침</span><span>낮</span><span>노을</span><span>밤</span></div>

    <label>파도 세기 <span class="value" data-wave-label></span></label>
    <input type="range" data-wave min="0" max="2" step="0.01" />

    <div class="row">
      <button type="button" data-sound></button>
      <button type="button" data-auto></button>
    </div>
  `
  document.body.appendChild(panel)

  const timeInput = panel.querySelector<HTMLInputElement>('[data-time]')!
  const timeLabelEl = panel.querySelector<HTMLElement>('[data-time-label]')!
  const waveInput = panel.querySelector<HTMLInputElement>('[data-wave]')!
  const waveLabelEl = panel.querySelector<HTMLElement>('[data-wave-label]')!

  const syncTimeLabel = (t: number) => (timeLabelEl.textContent = timeLabel(t))
  const syncWaveLabel = (v: number) => (waveLabelEl.textContent = `${Math.round(v * 100)}%`)

  timeInput.value = String(opts.initialTime)
  syncTimeLabel(opts.initialTime)
  timeInput.addEventListener('input', () => {
    const t = parseFloat(timeInput.value)
    syncTimeLabel(t)
    opts.onTimeChange(t)
  })

  waveInput.value = String(opts.initialWave)
  syncWaveLabel(opts.initialWave)
  waveInput.addEventListener('input', () => {
    const v = parseFloat(waveInput.value)
    syncWaveLabel(v)
    opts.onWaveChange(v)
  })

  // ---- 토글 버튼 (소리 / 자동 시간 흐름) ----
  const soundBtn = panel.querySelector<HTMLButtonElement>('[data-sound]')!
  const autoBtn = panel.querySelector<HTMLButtonElement>('[data-auto]')!

  let soundOn = opts.initialSound
  let autoOn = opts.initialAuto

  const syncSound = () => {
    soundBtn.textContent = soundOn ? '🔊 소리 켜짐' : '🔇 소리 꺼짐'
    soundBtn.classList.toggle('on', soundOn)
  }
  const syncAuto = () => {
    autoBtn.textContent = autoOn ? '🌗 자동 흐름' : '⏸ 시간 고정'
    autoBtn.classList.toggle('on', autoOn)
  }
  syncSound()
  syncAuto()

  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn
    syncSound()
    opts.onSoundToggle(soundOn)
  })
  autoBtn.addEventListener('click', () => {
    autoOn = !autoOn
    syncAuto()
    opts.onAutoToggle(autoOn)
  })

  return {
    setTime(t: number) {
      timeInput.value = String(t)
      syncTimeLabel(t)
    },
  }
}
