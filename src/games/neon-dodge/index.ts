import * as Phaser from 'phaser'
import type { GameContext, GameInstance, GameModule } from '../../engine/games/types'
import type { PlayerAction } from '../../engine/input/InputRouter'

const W = 960
const H = 540
const CLAMP = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

interface Falling {
  node: Phaser.GameObjects.Shape
  kind: 'hazard' | 'energy'
  speed: number
  radius: number
  spin: number
}

function createSynth(sound: GameContext['sound']) {
  let audio: AudioContext | null = null
  const play = (frequency: number, duration: number, waveform: OscillatorType = 'sine') => {
    if (sound.muted || sound.volume <= 0) return
    try {
      audio ??= new AudioContext()
      if (audio.state === 'suspended') { void audio.resume() }
      const oscillator = audio.createOscillator()
      const volume = audio.createGain()
      const time = audio.currentTime
      oscillator.type = waveform
      oscillator.frequency.setValueAtTime(frequency, time)
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, frequency * 0.58), time + duration)
      volume.gain.setValueAtTime(Math.max(0.0001, sound.volume * 0.085), time)
      volume.gain.exponentialRampToValueAtTime(0.001, time + duration)
      oscillator.connect(volume)
      volume.connect(audio.destination)
      oscillator.start(time)
      oscillator.stop(time + duration)
    } catch { /* No Web Audio in this environment. Game remains playable. */ }
  }
  return { play, destroy: () => { if (audio) void audio.close() } }
}

class NeonScene extends Phaser.Scene {
  private ready = false
  private pendingStart = false
  private running = false
  private held = new Set<PlayerAction>()
  private craft!: Phaser.GameObjects.Container
  private shieldHalo!: Phaser.GameObjects.Arc
  private timeLabel!: Phaser.GameObjects.Text
  private shieldLabel!: Phaser.GameObjects.Text
  private hint!: Phaser.GameObjects.Container
  private objects: Falling[] = []
  private elapsed = 0
  private score = 0
  private pickups = 0
  private spawnClock = 0
  private reportClock = 0
  private shieldTime = 0
  private cooldown = 0
  private flashTime = 0
  private lane = W / 2

  constructor(private ctx: GameContext, private synth: ReturnType<typeof createSynth>) {
    super({ key: 'NeonDodge' })
  }

  create() {
    this.cameras.main.setBackgroundColor('#080b18')
    this.add.rectangle(W / 2, H / 2, W, H, 0x070d1b)
    this.add.rectangle(W / 2, H / 2, 680, H, 0x0d1830, 0.64)
    const grid = this.add.graphics()
    grid.lineStyle(1, 0x3a567e, 0.17)
    for (let x = 140; x < 900; x += 68) grid.lineBetween(x, 40, x, H)
    for (let y = 55; y < H; y += 50) grid.lineBetween(130, y, 830, y)
    grid.lineStyle(2, 0x87efb0, 0.3)
    grid.lineBetween(130, 0, 130, H)
    grid.lineBetween(830, 0, 830, H)
    for (let i = 0; i < 45; i++) {
      const x = Phaser.Math.Between(140, 820)
      const y = Phaser.Math.Between(10, H - 10)
      this.add.circle(x, y, Phaser.Math.FloatBetween(0.5, 1.8), 0xb8d7ff, Phaser.Math.FloatBetween(0.1, 0.42))
    }
    this.add.text(28, 25, 'N E O N  /  D O D G E', { fontFamily: 'monospace', fontSize: '18px', color: '#c9fbd8', fontStyle: 'bold' })
    this.add.text(28, 65, 'SURVIVE THE DROP', { fontFamily: 'monospace', fontSize: '11px', color: '#66839c' })
    this.timeLabel = this.add.text(932, 26, '00:00', { fontFamily: 'monospace', fontSize: '20px', color: '#e9f6ff', fontStyle: 'bold' }).setOrigin(1, 0)
    this.shieldLabel = this.add.text(932, 59, 'SHIELD  READY', { fontFamily: 'monospace', fontSize: '12px', color: '#b3ff79' }).setOrigin(1, 0)

    const craftGlow = this.add.ellipse(0, 10, 86, 36, 0x70ffb0, 0.12)
    const wing = this.add.triangle(0, 0, 0, 0, 80, 0, 40, -55, 0x98ff91)
    const inner = this.add.triangle(0, -8, 0, 0, 43, 0, 22, -26, 0x10262b)
    const engine = this.add.ellipse(0, 15, 16, 24, 0x45dafa, 0.85)
    this.craft = this.add.container(W / 2, H - 62, [craftGlow, wing, inner, engine])
    this.shieldHalo = this.add.circle(W / 2, H - 62, 48, 0x77ffbd, 0.1).setStrokeStyle(3, 0x94ff9c).setVisible(false)

    const line1 = this.add.text(0, -32, 'YOU ARE THE LAST LIGHT.', { fontFamily: 'Space Grotesk, sans-serif', fontSize: '31px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5)
    const line2 = this.add.text(0, 14, 'DODGE RED. COLLECT GREEN. STAY ALIVE.', { fontFamily: 'monospace', fontSize: '14px', color: '#a1dabb' }).setOrigin(0.5)
    this.hint = this.add.container(W / 2, H / 2 - 25, [line1, line2]).setDepth(20)
    this.ready = true
    this.ctx.emit({ type: 'ready' })
    if (this.pendingStart) this.startRun()
  }
  startRun() {
    if (!this.ready) { this.pendingStart = true; return }
    for (const obj of this.objects) obj.node.destroy()
    this.objects = []
    this.held.clear()
    this.elapsed = 0
    this.score = 0
    this.pickups = 0
    this.spawnClock = 0
    this.reportClock = 0
    this.shieldTime = 0
    this.cooldown = 0
    this.flashTime = 0
    this.lane = W / 2
    this.craft.setX(this.lane).setAlpha(1)
    this.shieldHalo.setVisible(false)
    this.hint.setVisible(false)
    this.running = true
    this.pendingStart = false
    this.synth.play(470, 0.12)
    this.ctx.emit({ type: 'score', score: 0 })
  }
  setAction(action: PlayerAction, pressed: boolean) {
    if (pressed) {
      // Paused scenes must not accept new gameplay commands.
      if (!this.scene.isActive()) return
      this.held.add(action)
    } else this.held.delete(action)
    if (!this.running || !pressed) return
    if (action === 'PRIMARY_ACTION' && this.cooldown <= 0) {
      this.shieldTime = 0.85
      this.cooldown = 5.2
      this.synth.play(740, 0.24, 'triangle')
    }
  }
  private addFalling() {
    const x = Phaser.Math.Between(164, 796)
    const energy = Math.random() < 0.22
    const radius = energy ? 13 : Phaser.Math.Between(16, 29)
    let node: Phaser.GameObjects.Shape
    if (energy) {
      node = this.add.circle(x, -30, radius, 0xb5ff79, 0.95).setStrokeStyle(4, 0x4dda9a)
      this.addSpark(x, -30, 0xa6ff79, 0.12)
    } else {
      node = this.add.rectangle(x, -30, radius * 1.7, radius * 1.7, 0xff5c6b, 0.9)
      ;(node as Phaser.GameObjects.Rectangle).setStrokeStyle(3, 0xffb174, 0.8)
      node.setRotation(Math.random() * 3)
    }
    this.objects.push({ node, kind: energy ? 'energy' : 'hazard', speed: 170 + Math.min(250, this.elapsed * 3.8) + Math.random() * 90, radius, spin: (Math.random() - 0.5) * 1.8 })
  }
  private addSpark(x: number, y: number, color: number, alpha = 0.9) {
    const spark = this.add.circle(x, y, 8, color, alpha).setDepth(5)
    this.tweens.add({ targets: spark, scale: 2.8, alpha: 0, duration: 280, onComplete: () => spark.destroy() })
  }
  update(_time: number, delta: number) {
    if (!this.running) return
    const dt = Math.min(0.05, delta / 1000)
    this.elapsed += dt
    this.reportClock += dt
    this.spawnClock += dt
    this.shieldTime = Math.max(0, this.shieldTime - dt)
    this.cooldown = Math.max(0, this.cooldown - dt)
    this.flashTime = Math.max(0, this.flashTime - dt)
    const left = this.held.has('MOVE_LEFT')
    const right = this.held.has('MOVE_RIGHT')
    const horizontal = Number(right) - Number(left)
    this.lane = CLAMP(this.lane + horizontal * 410 * dt, 160, 800)
    this.craft.setX(this.lane).setRotation(horizontal * 0.13)
    this.shieldHalo.setX(this.lane).setVisible(this.shieldTime > 0)
    this.shieldLabel.setText(this.shieldTime > 0 ? 'SHIELD  ACTIVE' : this.cooldown > 0 ? `SHIELD  ${this.cooldown.toFixed(1)}s` : 'SHIELD  READY')
    this.shieldLabel.setColor(this.cooldown > 0 && this.shieldTime === 0 ? '#8295a4' : '#b3ff79')
    this.timeLabel.setText(`${Math.floor(this.elapsed / 60).toString().padStart(2, '0')}:${Math.floor(this.elapsed % 60).toString().padStart(2, '0')}`)
    const spawnInterval = Math.max(0.25, 0.9 - this.elapsed * 0.009)
    if (this.spawnClock >= spawnInterval) { this.spawnClock = 0; this.addFalling() }
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const item = this.objects[i]
      item.node.y += item.speed * dt
      item.node.rotation += item.spin * dt
      if (item.node.y > H + 45) { item.node.destroy(); this.objects.splice(i, 1); continue }
      if (Math.abs(item.node.x - this.lane) < item.radius + 23 && Math.abs(item.node.y - (H - 64)) < item.radius + 22) {
        this.objects.splice(i, 1)
        item.node.destroy()
        if (item.kind === 'energy') {
          this.pickups += 1
          this.addSpark(this.lane, H - 70, 0xa6ff79)
          this.synth.play(620 + this.pickups % 4 * 100, 0.16, 'sine')
          this.flashTime = 0.18
        } else if (this.shieldTime > 0) {
          this.addSpark(this.lane, H - 72, 0x74e7ff)
          this.synth.play(240, 0.12, 'square')
        } else {
          this.running = false
          this.craft.setAlpha(0.32)
          this.addSpark(this.lane, H - 62, 0xff6978)
          this.cameras.main.flash(180, 255, 68, 93)
          this.synth.play(120, 0.42, 'sawtooth')
          this.ctx.emit({ type: 'ended', score: this.score, reason: 'game-over' })
          return
        }
      }
    }
    this.score = Math.floor(this.elapsed * 12 + this.pickups * 100)
    if (this.reportClock > 0.14) {
      this.reportClock = 0
      this.ctx.emit({ type: 'score', score: this.score })
    }
  }
  shutdown() {
    this.running = false
    this.held.clear()
  }
}
export const mount: GameModule['mount'] = async (context) => {
  const synth = createSynth(context.sound)
  const scene = new NeonScene(context, synth)
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: context.parent,
    width: W, height: H,
    transparent: false,
    backgroundColor: '#080b18',
    render: { antialias: true, pixelArt: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
    scene: [scene],
    fps: { target: 60, min: 30 },
  })
  const off = context.input.subscribe(event => {
    if (event.playerId !== context.playerId || event.repeated) return
    if (['MOVE_LEFT', 'MOVE_RIGHT', 'PRIMARY_ACTION'].includes(event.action)) {
      scene.setAction(event.action, event.phase === 'pressed')
    }
  })
  let destroyed = false
  return {
    start: () => scene.startRun(),
    pause: () => { if (!destroyed) scene.scene.pause() },
    resume: () => { if (!destroyed) scene.scene.resume() },
    restart: () => { if (!destroyed) { scene.scene.resume(); scene.startRun() } },
    destroy: () => {
      if (destroyed) return
      destroyed = true
      off()
      scene.shutdown()
      synth.destroy()
      game.destroy(true)
    },
  }
}
