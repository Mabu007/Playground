/**
 * Kasi Maze's original generative soundtrack and SFX.
 * No borrowed samples: each note is synthesized locally through Web Audio.
 * One scheduler, one AudioContext, and all nodes are released on exit.
 */
export type KasiMusicMode = 'off' | 'menu' | 'game' | 'power' | 'danger'
export type KasiEffect = 'navigate' | 'confirm' | 'countdown' | 'go' | 'pickup' | 'power' | 'tag' | 'hit' | 'level' | 'over' | 'pause' | 'highscore' | 'milestone'
export interface KasiSound { volume: number; muted: boolean; musicVolume?: number }
const BPM = 114
const STEP = 60 / BPM / 4
const ROOTS = [45, 45, 41, 43, 45, 48, 41, 40, 45, 45, 41, 43, 45, 48, 41, 40]
const LOG_PATTERNS = [
  [[0,0],[3,12],[6,7],[9,0],[11,0],[14,3]],
  [[2,0],[5,7],[8,12],[10,0],[13,7],[15,0]],
  [[0,0],[4,12],[7,7],[10,0],[12,0],[15,7]],
  [[1,0],[3,0],[6,12],[9,7],[12,0],[14,12],[15,7]],
]
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)
const LOOP_STEPS = ROOTS.length * 16
export class AudioDirector {
  private context: AudioContext | null = null
  private music: GainNode | null = null
  private effects: GainNode | null = null
  private noise: AudioBuffer | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private step = 0
  private next = 0
  private state: KasiMusicMode = 'off'
  private settings: KasiSound
  private destroyed = false
  private paused = false
  private lastPickup = 0
  private autoMuted = false
  private readonly onBlur = () => { this.autoMuted = true; this.applyGain() }
  private readonly onFocus = () => { this.autoMuted = false; this.applyGain() }
  private readonly onVisibility = () => {
    this.autoMuted = typeof document !== 'undefined' && document.visibilityState === 'hidden'
    this.applyGain()
  }
  constructor(settings: KasiSound) {
    this.settings = { ...settings }
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', this.onBlur)
      window.addEventListener('focus', this.onFocus)
      document.addEventListener('visibilitychange', this.onVisibility)
    }
  }
  configure(settings: KasiSound) {
    this.settings = { ...settings }
    this.applyGain()
  }
  unlock() {
    if (this.destroyed) return
    try {
      if (!this.context) {
        const context = new AudioContext()
        this.context = context
        this.music = context.createGain()
        this.effects = context.createGain()
        const limiter = context.createDynamicsCompressor()
        limiter.threshold.value = -16
        limiter.knee.value = 18
        limiter.ratio.value = 5
        limiter.attack.value = .008
        limiter.release.value = .15
        this.music.connect(limiter)
        this.effects.connect(limiter)
        limiter.connect(context.destination)
        const buffer = context.createBuffer(1, Math.floor(context.sampleRate * .16), context.sampleRate)
        const data = buffer.getChannelData(0)
        // Deterministic noise avoids heavyweight decoded samples.
        let seed = 20261119
        for (let i = 0; i < data.length; i++) {
          seed = (Math.imul(seed,1664525)+1013904223) | 0
          data[i] = ((seed >>> 1) / 1073741824 - 1) * .7
        }
        this.noise = buffer
        this.next = context.currentTime + .06
        this.timer = setInterval(() => this.schedule(), 55)
      }
      if (this.context.state !== 'running') void this.context.resume().catch(() => {})
      this.applyGain()
    } catch { /* Browsers without AudioContext still run the game. */ }
  }
  private applyGain() {
    if (!this.context || !this.music || !this.effects) return
    const volume = this.settings.muted || this.autoMuted ? 0 : Math.max(0,Math.min(1,this.settings.volume))
    const now = this.context.currentTime
    this.effects.gain.setTargetAtTime(volume * .46, now, .03)
    const level = this.state === 'off' || this.paused || this.autoMuted ? 0 : this.state === 'menu' ? .24 : this.state === 'power' ? .44 : this.state === 'danger' ? .34 : .36
    this.music.gain.setTargetAtTime(volume * (this.settings.musicVolume ?? .75) * level, now, .11)
  }
  mode(mode: KasiMusicMode) {
    if (this.destroyed) return
    this.state = mode
    this.applyGain()
  }
  pause() { this.paused = true; this.applyGain() }
  resume() { this.paused = false; this.unlock(); this.applyGain() }
  private voice(frequency: number, time: number, length: number, amplitude: number, type: OscillatorType, destination: AudioNode, pitchDrop = 1) {
    const context = this.context
    if (!context || !Number.isFinite(time) || !Number.isFinite(frequency)) return
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(Math.max(32,frequency), time)
    if (pitchDrop !== 1) oscillator.frequency.exponentialRampToValueAtTime(Math.max(34,frequency * pitchDrop), time + length * .85)
    gain.gain.setValueAtTime(.0001, time)
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,amplitude), time + .007)
    gain.gain.exponentialRampToValueAtTime(.0001, time + length)
    oscillator.connect(gain); gain.connect(destination)
    oscillator.start(time); oscillator.stop(time + length + .012)
  }
  private percussion(time: number, length: number, volume: number, frequency: number) {
    if (!this.context || !this.noise || !this.music) return
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    source.buffer = this.noise
    filter.type = 'highpass'
    filter.frequency.setValueAtTime(frequency,time)
    gain.gain.setValueAtTime(volume,time)
    gain.gain.exponentialRampToValueAtTime(.0001,time+length)
    source.connect(filter); filter.connect(gain); gain.connect(this.music)
    source.start(time); source.stop(time + length)
  }
  private playStep(step: number, time: number) {
    if (!this.music || this.state === 'off' || this.paused || this.autoMuted || this.settings.muted) return
    const pos = step % 16
    const bar = Math.floor(step / 16)
    const section = Math.floor(bar / 4)
    const swing = time + (pos % 2 ? STEP * .18 : 0)
    const active = this.state === 'power'
    const root = ROOTS[bar]
    if (pos % 4 === 0 || ((active || bar % 4 === 3) && pos === 14)) {
      this.voice(156, time, .19, active ? .85 : .72, 'sine', this.music, .29)
    }
    if (pos % 4 === 2) this.percussion(time, .052, .095, 6700)
    if (pos % 4 === 3) this.percussion(swing, .085, pos === 15 ? .13 : .04, 4500)
    if (pos === 4 || pos === 12) {
      this.percussion(time, .095, .16, 1400)
      this.percussion(time + .019, .065, .055, 2300)
    }
    const bass = LOG_PATTERNS[bar % 4].find(([at]) => at === pos)
    if (bass) {
      const note = hz(root + bass[1])
      this.voice(note * 1.36, swing, .17, .58, 'sine', this.music, .73)
      this.voice(note * 2, swing, .075, .12, 'triangle', this.music, .84)
    }
    if ([0, 6, 10].includes(pos) && !(section === 2 && pos === 6)) {
      const voicing = bar % 4 === 3 ? [12, 16, 19, 22] : [12, 15, 19, 22]
      for (const [index, interval] of voicing.entries()) {
        this.voice(hz(root + interval + 12), swing + index * .009, .22 - index * .025, .074, 'triangle', this.music)
      }
    }
    if ((section >= 2 || active) && [2, 5, 9, 13].includes(pos)) {
      const lead = [31, 27, 34, 29][(pos + bar) % 4]
      this.voice(hz(root + lead), swing, .16, .085, 'sine', this.music)
      this.voice(hz(root + lead), swing + STEP * 1.5, .11, .027, 'sine', this.music)
    }
  }
  private schedule() {
    if (!this.context || this.context.state !== 'running' || this.destroyed) return
    const now = this.context.currentTime
    if (this.next < now - .2) this.next = now + .03
    let steps = 0
    while (this.next < now + .14 && steps++ < 6) {
      this.playStep(this.step,this.next)
      this.step = (this.step + 1) % LOOP_STEPS
      this.next += STEP
    }
  }
  effect(cue: KasiEffect, variation = 0) {
    const context = this.context
    const out = this.effects
    if (!context || !out || this.destroyed || this.settings.muted || this.autoMuted || this.paused) return
    const now = context.currentTime + .003
    if (cue === 'pickup') {
      if (now - this.lastPickup < .065) return
      this.lastPickup = now
      const note=hz([76,79,81,84,86,88][variation%6])
      this.voice(note,now,.068,.21,'sine',out,1.34)
      this.voice(note/2,now+.008,.05,.11,'triangle',out)
      return
    }
    const pitches: Record<Exclude<KasiEffect,'pickup'>, [number,number,number,OscillatorType]> = {
      navigate:[600,.07,.22,'sine'], confirm:[670,.19,.33,'triangle'],
      countdown:[420,.14,.24,'triangle'],go:[830,.3,.43,'triangle'],
      power:[220,.36,.48,'triangle'],tag:[670,.22,.48,'triangle'],
      hit:[160,.37,.5,'triangle'],level:[640,.36,.42,'triangle'],
      over:[210,.52,.45,'sine'],pause:[300,.16,.19,'sine'],
      highscore:[880,.44,.5,'triangle'],milestone:[523,.20,.32,'sine'],
    }
    const [freq,length,gain,type] = pitches[cue]
    this.voice(freq,now,length,gain,type,out,cue==='hit' || cue==='over' ? .39 : 1.35)
    if (cue === 'level' || cue === 'highscore' || cue === 'go' || cue === 'power' || cue === 'tag' || cue === 'milestone') {
      this.voice(freq * 1.5,now+.085,length*.82,gain*.6,'sine',out,1.2)
      this.voice(freq * 2,now+.17,length*.68,gain*.45,'sine',out,1.14)
    } else if (cue === 'over') {
      this.voice(freq * .75, now + .16, .4, .37, 'triangle', out, .63)
      this.voice(freq * .5, now + .36, .52, .44, 'sine', out, .55)
    }
  }
  dispose() {
    if (this.destroyed) return
    this.destroyed = true
    if (typeof window !== 'undefined') {
      window.removeEventListener('blur', this.onBlur)
      window.removeEventListener('focus', this.onFocus)
      document.removeEventListener('visibilitychange', this.onVisibility)
    }
    if (this.timer !== null) clearInterval(this.timer)
    this.timer = null
    this.state = 'off'
    if (this.context) {
      this.music?.gain.setValueAtTime(0,this.context.currentTime)
      this.effects?.gain.setValueAtTime(0,this.context.currentTime)
      void this.context.close().catch(() => {})
    }
    this.context = null
    this.music = null
    this.effects = null
    this.noise = null
  }
}
let sessionAudio: AudioDirector | null = null
export function getKasiAudio(settings: KasiSound): AudioDirector {
  sessionAudio ??= new AudioDirector(settings)
  sessionAudio.configure(settings)
  return sessionAudio
}
export function disposeKasiAudio() {
  sessionAudio?.dispose()
  sessionAudio = null
}
