/**
 * Kasi Maze's original generative soundtrack and SFX.
 * No borrowed samples: each note is synthesized locally through Web Audio.
 * One scheduler, one AudioContext, and all nodes are released on exit.
 */
export type KasiMusicMode = 'off' | 'menu' | 'game' | 'power' | 'danger'
export type KasiEffect = 'navigate' | 'confirm' | 'countdown' | 'go' | 'pickup' | 'power' | 'tag' | 'hit' | 'level' | 'over' | 'pause' | 'highscore'
export interface KasiSound { volume: number; muted: boolean; musicVolume?: number }
const BPM = 112
const STEP = 60 / BPM / 4
const NOTES = [55, 65.406, 73.416, 82.407] // A1, C2, D2, E2
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
  constructor(settings: KasiSound) { this.settings = { ...settings } }
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
        this.music.connect(context.destination)
        this.effects.connect(context.destination)
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
    const volume = this.settings.muted ? 0 : Math.max(0,Math.min(1,this.settings.volume))
    const now = this.context.currentTime
    this.effects.gain.setTargetAtTime(volume * .4, now, .03)
    const level = this.state === 'off' || this.paused ? 0 : this.state === 'menu' ? .22 : this.state === 'power' ? .38 : this.state === 'danger' ? .34 : .31
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
    if (!this.music || this.state === 'off' || this.paused) return
    const pos = step % 16
    const bar = Math.floor(step/16) % 4
    const active = this.state === 'power'
    const tonic = NOTES[bar]
    const kick = pos === 0 || pos === 4 || pos === 8 || pos === 12 || (active && pos === 14)
    if (kick) this.voice(142,time,.23,active ? .86 : .66,'sine',this.music,.29)
    if ([2,6,10,14].includes(pos)) this.percussion(time,.065,.11,6400)
    if ([3,7,11,15].includes(pos)) this.percussion(time,.12,.065,4100)
    if (pos === 4 || pos === 12) this.percussion(time,.14,.17,1700)
    const bassPattern = [0,-1,2,-1,0,-1,3,-1,2,-1,0,3,-1,2,-1,0]
    const bassNote = bassPattern[pos]
    if (bassNote !== -1) this.voice(tonic * [1,1.5,1.334,1.125][bassNote],time,STEP*.95, .38, 'triangle',this.music,.78)
    if ([0,6,10,14].includes(pos)) {
      const note = tonic * [4,4.5,5,6][(Math.floor(pos/4)+bar)%4]
      this.voice(note,time,.18,.13,'sine',this.music)
    }
    if ((active || this.state === 'menu') && [2,5,9,13].includes(pos)) {
      this.voice(tonic * [8,9,10,12][(pos+bar)%4],time,.13,.075,'triangle',this.music)
    }
  }
  private schedule() {
    if (!this.context || this.context.state !== 'running' || this.destroyed) return
    const now = this.context.currentTime
    if (this.next < now - .2) this.next = now + .03
    let steps = 0
    while (this.next < now + .14 && steps++ < 6) {
      this.playStep(this.step,this.next)
      this.step++
      this.next += STEP
    }
  }
  effect(cue: KasiEffect, variation = 0) {
    const context = this.context
    const out = this.effects
    if (!context || !out || this.destroyed || this.settings.muted) return
    const now = context.currentTime + .003
    if (cue === 'pickup') {
      if (now - this.lastPickup < .065) return
      this.lastPickup = now
      this.voice(430 + (variation % 6) * 33,now,.085,.23,'sine',out,1.5)
      return
    }
    const pitches: Record<Exclude<KasiEffect,'pickup'>, [number,number,number,OscillatorType]> = {
      navigate:[600,.07,.22,'sine'], confirm:[670,.19,.33,'triangle'],
      countdown:[420,.14,.24,'triangle'],go:[830,.3,.43,'triangle'],
      power:[210,.45,.65,'sawtooth'],tag:[890,.26,.42,'triangle'],
      hit:[142,.46,.64,'sawtooth'],level:[640,.36,.42,'triangle'],
      over:[210,.52,.45,'sine'],pause:[300,.16,.19,'sine'],
      highscore:[880,.44,.5,'triangle'],
    }
    const [freq,length,gain,type] = pitches[cue]
    this.voice(freq,now,length,gain,type,out,cue==='hit' ? .3 : 1.35)
    if (cue === 'level' || cue === 'highscore' || cue === 'go') {
      this.voice(freq * 1.5,now+.085,length*.82,gain*.6,'sine',out,1.2)
      this.voice(freq * 2,now+.17,length*.68,gain*.45,'sine',out,1.14)
    }
  }
  dispose() {
    if (this.destroyed) return
    this.destroyed = true
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
