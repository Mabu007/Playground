import * as Phaser from 'phaser'
import type { GameContext, GameInstance, GameModule } from '../../engine/games/types'
import type { PlayerAction } from '../../engine/input/InputRouter'
import {
  createMaze, walkable, neighbors, routeTowards, keyOf, DELTA, OPPOSITE,
  PLAYER_SPAWN, type Maze, type Direction, type Point,
} from './maze'

/**
 * KASI MAZE — original maze-chase arcade game for PLAYGROUND.
 * No external assets; renderer, characters, audio and maze designs are original.
 * Physics and enemy decisions stay entirely within the game module.
 */
const WIDTH = 1600
const HEIGHT = 900
const TILE = 34
const LEFT = (WIDTH - 27 * TILE) / 2
const TOP = 116
const CENTER = (point: Point) => ({ x: LEFT + (point.x + 0.5) * TILE, y: TOP + (point.y + 0.5) * TILE })
type RivalStyle = { name: string; color: number; corner: Point; personality: number }
const RIVALS: RivalStyle[] = [
  { name: 'VUMA', color: 0xff647f, corner: { x: 25, y: 1 }, personality: 0 },
  { name: 'DUMA', color: 0x65e5fb, corner: { x: 1, y: 1 }, personality: 1 },
  { name: 'ZOLA', color: 0xffba68, corner: { x: 25, y: 19 }, personality: 2 },
  { name: 'MAKHI', color: 0xb193ff, corner: { x: 1, y: 19 }, personality: 3 },
]

interface Mover {
  col: number
  row: number
  direction: Direction | null
  progress: number
  node: Phaser.GameObjects.Container
}
interface Rival extends Mover {
  style: RivalStyle
  releaseAt: number
  respawnIn: number
}
function limit(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }
function alignedTarget(target: Point): Point { return { x: limit(target.x, 1, 25), y: limit(target.y, 1, 19) } }
function createAudio(config: GameContext['sound']) {
  let audio: AudioContext | undefined
  function tone(frequency: number, seconds = .08, waveform: OscillatorType = 'sine', strength = 1) {
    if (config.muted || config.volume <= 0) return
    try {
      audio ??= new AudioContext()
      if (audio.state === 'suspended') void audio.resume()
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      const now = audio.currentTime
      osc.type = waveform
      osc.frequency.setValueAtTime(frequency, now)
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * .76), now + seconds)
      gain.gain.setValueAtTime(Math.max(.0001, config.volume * .06 * strength), now)
      gain.gain.exponentialRampToValueAtTime(.001, now + seconds)
      osc.connect(gain)
      gain.connect(audio.destination)
      osc.start(now)
      osc.stop(now + seconds)
    } catch { /* The arcade remains playable without Web Audio. */ }
  }
  return { tone, dispose: () => { if (audio) void audio.close() } }
}
class KasiMazeScene extends Phaser.Scene {
  private maze = createMaze()
  private wallPaint!: Phaser.GameObjects.Graphics
  private surface!: Phaser.GameObjects.Graphics
  private dots = new Map<string, Phaser.GameObjects.Arc>()
  private runner!: Mover
  private rivals: Rival[] = []
  private desired: Direction | null = null
  private held = new Set<Direction>()
  private prepared = false
  private startPending = false
  private running = false
  private score = 0
  private lives = 3
  private level = 1
  private time = 0
  private empowered = 0
  private invincible = 0
  private pulse = 0
  private combo = 0
  private remainingLabel!: Phaser.GameObjects.Text
  private livesLabel!: Phaser.GameObjects.Text
  private levelLabel!: Phaser.GameObjects.Text
  private statusLabel!: Phaser.GameObjects.Text
  private speech!: Phaser.GameObjects.Text
  private progressBar!: Phaser.GameObjects.Rectangle
  private cameraGlow!: Phaser.GameObjects.Arc
  private trailTime = 0
  private intro = 0
  private totalAtStart = 0
  constructor(private readonly context: GameContext, private readonly audio: ReturnType<typeof createAudio>) {
    super({ key: 'KasiMaze' })
  }
  create() {
    this.cameras.main.setBackgroundColor('#080c18')
    this.makeBackdrop()
    this.surface = this.add.graphics().setDepth(1)
    this.wallPaint = this.add.graphics().setDepth(2)
    this.makeInterface()
    this.makeCharacters()
    this.prepared = true
    this.context.emit({ type: 'ready' })
    if (this.startPending) this.startGame()
  }
  private makeBackdrop() {
    const bg = this.add.graphics().setDepth(0)
    bg.fillStyle(0x080c18).fillRect(0, 0, WIDTH, HEIGHT)
    bg.fillStyle(0x0a1423).fillRoundedRect(LEFT - 16, TOP - 16, 27 * TILE + 32, 21 * TILE + 32, 26)
    bg.lineStyle(2, 0x3d836e, .45).strokeRoundedRect(LEFT - 15, TOP - 15, 27 * TILE + 30, 21 * TILE + 30, 25)
    bg.lineStyle(1, 0x8cffc9, .15).strokeRoundedRect(LEFT - 23, TOP - 23, 27 * TILE + 46, 21 * TILE + 46, 29)
    // A physical-arcade inspired atmosphere: scan lines and stylized luminous architecture.
    for (let y = 14; y < HEIGHT; y += 18) bg.lineStyle(1, 0x9eeac8, .028).lineBetween(0, y, WIDTH, y)
    for (let i = 0; i < 14; i++) {
      const x = 68 + i * 112
      bg.fillStyle(0x86ffb0, .025).fillRect(x, 0, 2, HEIGHT)
    }
    bg.lineStyle(2, 0x99ffb5, .13).lineBetween(0, 87, WIDTH, 87)
    bg.lineStyle(1, 0x99ffb5, .13).lineBetween(0, 856, WIDTH, 856)
    this.add.text(LEFT - 73, TOP + 200, 'K  /  A  /  S  /  I', {
      fontFamily: 'monospace', fontSize: '12px', color: '#538b81', letterSpacing: 4,
    }).setAngle(-90).setOrigin(.5).setAlpha(.7)
    this.add.text(LEFT + 27 * TILE + 72, TOP + 490, 'N E V E R  S T O P  M O V I N G', {
      fontFamily: 'monospace', fontSize: '12px', color: '#538b81',
    }).setAngle(90).setOrigin(.5).setAlpha(.7)
    for (let i = 0; i < 16; i++) {
      const x = 55 + i * 97
      this.add.circle(x, HEIGHT - 20, 2 + i % 2, 0x8cffc9, .17)
    }
  }
  private makeInterface() {
    const heading = this.add.text(LEFT, 38, 'KASI / MAZE', {
      fontFamily: 'Space Grotesk, sans-serif', fontSize: '27px', color: '#eaffed', fontStyle: 'bold',
    }).setDepth(6)
    heading.setShadow(0, 0, '#98ffb0', 9)
    this.add.text(LEFT + 230, 46, 'THE STREETS ARE ALIVE', {
      fontFamily: 'monospace', fontSize: '12px', color: '#6c9789',
    }).setDepth(6)
    this.livesLabel = this.add.text(LEFT + 27 * TILE - 4, 42, '●  ●  ●', {
      fontFamily: 'monospace', fontSize: '22px', color: '#b6ff73',
    }).setOrigin(1, 0).setDepth(6)
    this.levelLabel = this.add.text(72, 296, 'DISTRICT 01', {
      fontFamily: 'monospace', fontSize: '20px', color: '#c4ff92', fontStyle: 'bold',
    }).setDepth(6)
    this.add.text(72, 329, 'STAY SHARP', { fontFamily: 'monospace', fontSize: '13px', color: '#73918c' }).setDepth(6)
    this.add.text(72, 430, 'GRAB THE BEATS', { fontFamily: 'monospace', fontSize: '12px', color: '#8ca59c' }).setDepth(6)
    this.add.circle(85, 469, 6, 0x9dfff1)
    this.add.text(103, 461, '10 PTS', { fontFamily: 'monospace', fontSize: '16px', color: '#d6fff4' }).setDepth(6)
    this.add.circle(85, 510, 11, 0xffd26b, .25).setStrokeStyle(3, 0xffd26b)
    this.add.text(103, 502, 'POWER UP', { fontFamily: 'monospace', fontSize: '16px', color: '#ffe7b2' }).setDepth(6)
    const rightX = LEFT + 27 * TILE + 50
    this.remainingLabel = this.add.text(rightX, 295, 'BEATS LEFT', {
      fontFamily: 'monospace', fontSize: '14px', color: '#839e99',
    }).setDepth(6)
    this.statusLabel = this.add.text(rightX, 335, '000', {
      fontFamily: 'Space Grotesk, sans-serif', fontSize: '51px', fontStyle: 'bold', color: '#b9ff8b',
    }).setDepth(6)
    this.add.text(rightX, 470, 'POWER MODE', { fontFamily: 'monospace', fontSize: '12px', color: '#829b97' }).setDepth(6)
    this.add.rectangle(rightX + 90, 506, 180, 9, 0x20352f).setDepth(6)
    this.progressBar = this.add.rectangle(rightX, 506, 0, 9, 0xa5ffad).setOrigin(0, .5).setDepth(7)
    this.speech = this.add.text(WIDTH / 2, 872, 'ARROW KEYS / WASD TO MOVE  •  P TO PAUSE', {
      fontFamily: 'monospace', fontSize: '14px', color: '#6f938c',
    }).setOrigin(.5).setDepth(6)
    this.cameraGlow = this.add.circle(WIDTH / 2, HEIGHT / 2, 300, 0x9fff95, .008).setDepth(0)
  }
  private drawRunner() {
    const g = this.add.graphics()
    g.fillStyle(0x6dffaf, .10).fillCircle(0, 1, 21)
    g.lineStyle(2, 0x90ffbf, .4).strokeCircle(0, 0, 17)
    g.fillStyle(0x1d3842).fillRoundedRect(-13, -12, 26, 28, 9)
    g.fillStyle(0xb9ff83).fillRoundedRect(-12, -14, 24, 24, 7)
    g.fillStyle(0x16333b).fillRoundedRect(-12, -9, 24, 11, 4)
    g.fillStyle(0xeaffdf).fillRoundedRect(-8, -8, 6, 6, 2).fillRoundedRect(2, -8, 6, 6, 2)
    g.fillStyle(0x6deee0).fillRoundedRect(-10, 11, 8, 7, 2).fillRoundedRect(2, 11, 8, 7, 2)
    g.lineStyle(2, 0xc5ffab, .9).lineBetween(-10, -16, 7, -16)
    return this.add.container(0, 0, [g]).setDepth(9)
  }
  private drawRival(style: RivalStyle) {
    const g = this.add.graphics()
    const color = style.color
    g.fillStyle(color, .12).fillCircle(0, 0, 22)
    g.lineStyle(2, color, .55).strokeCircle(0, 0, 18)
    g.fillStyle(0x121a2b).fillRoundedRect(-13, -12, 26, 25, 6)
    g.fillStyle(color).fillRoundedRect(-11, -12, 22, 18, 5)
    g.fillStyle(0x142131).fillRoundedRect(-10, -5, 20, 10, 3)
    g.fillStyle(0xffffff).fillCircle(-5, -1, 3).fillCircle(5, -1, 3)
    g.fillStyle(color).fillRoundedRect(-11, 11, 6, 7, 2).fillRoundedRect(5, 11, 6, 7, 2)
    g.lineStyle(3, color, .85).lineBetween(0, -12, 0, -19)
    g.fillStyle(0xeaf7ff).fillCircle(0, -20, 3)
    return this.add.container(0, 0, [g]).setDepth(8)
  }
  private makeCharacters() {
    this.runner = {
      col: PLAYER_SPAWN.x, row: PLAYER_SPAWN.y, progress: 0, direction: null,
      node: this.drawRunner(),
    }
    this.rivals = RIVALS.map((style, index) => ({
      col: this.maze.enemies[index].x, row: this.maze.enemies[index].y,
      progress: 0, direction: null, node: this.drawRival(style),
      style, releaseAt: 2 + index * 2.2, respawnIn: 0,
    }))
  }
  private drawBoard() {
    const floor = this.surface
    const walls = this.wallPaint
    floor.clear()
    walls.clear()
    for (const dot of this.dots.values()) dot.destroy()
    this.dots.clear()
    const panelSize = TILE * 27
    floor.fillStyle(0x0b1425).fillRoundedRect(LEFT, TOP, panelSize, TILE * 21, 12)
    floor.lineStyle(1, 0x3a7c86, .09)
    for (let col = 0; col <= 27; col++) {
      const x = LEFT + col * TILE
      floor.lineBetween(x, TOP, x, TOP + 21 * TILE)
    }
    for (let row = 0; row <= 21; row++) {
      const y = TOP + row * TILE
      floor.lineBetween(LEFT, y, LEFT + panelSize, y)
    }
    for (let y = 0; y < this.maze.height; y++) {
      for (let x = 0; x < this.maze.width; x++) {
        if (!this.maze.walls[y][x]) continue
        const tileX = LEFT + x * TILE
        const tileY = TOP + y * TILE
        walls.fillStyle(0x112c39).fillRect(tileX, tileY, TILE, TILE)
        walls.fillStyle(0x173a4b).fillRoundedRect(tileX + 2.5, tileY + 2.5, TILE - 5, TILE - 5, 6)
        walls.fillStyle(0x21485a, .44).fillRoundedRect(tileX + 7, tileY + 7, TILE - 14, TILE - 14, 4)
        // Highlight exposed edges as continuous neon street lines.
        const adjacent = [
          { x: x + 1, y, d: 'right' },
          { x: x - 1, y, d: 'left' },
          { x, y: y + 1, d: 'down' },
          { x, y: y - 1, d: 'up' },
        ] as const
        walls.lineStyle(2.8, 0x56eacc, .78)
        for (const edge of adjacent) {
          if (edge.x < 0 || edge.y < 0 || edge.x >= 27 || edge.y >= 21 || this.maze.walls[edge.y][edge.x]) continue
          if (edge.d === 'right') walls.lineBetween(tileX + TILE - 2, tileY + 3, tileX + TILE - 2, tileY + TILE - 3)
          else if (edge.d === 'left') walls.lineBetween(tileX + 2, tileY + 3, tileX + 2, tileY + TILE - 3)
          else if (edge.d === 'up') walls.lineBetween(tileX + 3, tileY + 2, tileX + TILE - 3, tileY + 2)
          else walls.lineBetween(tileX + 3, tileY + TILE - 2, tileX + TILE - 3, tileY + TILE - 2)
        }
      }
    }
    for (const [key, kind] of this.maze.pellets) {
      const [x, y] = key.split(',').map(Number)
      const pos = CENTER({ x, y })
      const dot = kind === 'boost'
        ? this.add.circle(pos.x, pos.y, 10, 0xffd280, .93).setStrokeStyle(3, 0xffedb1, .75)
        : this.add.circle(pos.x, pos.y, 3.2, 0xc5fff0, .88)
      dot.setDepth(4)
      this.dots.set(key, dot)
      if (kind === 'boost') {
        this.tweens.add({ targets: dot, scale: 1.2, yoyo: true, repeat: -1, duration: 520 + (x % 3) * 70 })
      }
    }
    this.totalAtStart = this.dots.size
    this.updateHUD()
  }
  private place(mover: Mover) {
    const position = CENTER({ x: mover.col, y: mover.row })
    mover.node.setPosition(position.x, position.y)
    mover.node.setRotation(0)
  }
  private resetPositions() {
    const spawn = this.maze.start
    this.runner.col = spawn.x
    this.runner.row = spawn.y
    this.runner.direction = null
    this.runner.progress = 0
    this.place(this.runner)
    this.rivals.forEach((rival, i) => {
      rival.col = this.maze.enemies[i].x
      rival.row = this.maze.enemies[i].y
      rival.direction = null
      rival.progress = 0
      rival.releaseAt = this.time + 1.6 + i * 2.2
      rival.respawnIn = 0
      rival.node.setAlpha(1).setVisible(true).setScale(1)
      this.place(rival)
    })
    this.desired = null
    this.held.clear()
  }
  private startGame() {
    if (!this.prepared) { this.startPending = true; return }
    this.level = 1
    this.score = 0
    this.lives = 3
    this.time = 0
    this.running = true
    this.empowered = 0
    this.combo = 0
    this.invincible = 3
    this.intro = 2.2
    this.maze = createMaze(this.level)
    this.drawBoard()
    this.resetPositions()
    this.audio.tone(540, .16, 'triangle')
    this.speech.setText('COLLECT THE BEATS. OUTRUN THE CREW.')
    this.context.emit({ type: 'score', score: this.score })
  }
  private nextLevel() {
    this.level++
    this.score += 800 * this.level
    this.time += .1
    this.empowered = 0
    this.combo = 0
    this.invincible = 2.8
    this.intro = 2
    this.maze = createMaze(this.level)
    this.drawBoard()
    this.resetPositions()
    this.cameras.main.flash(260, 127, 255, 173)
    this.speech.setText('DISTRICT CLEARED. NEW STREETS UNLOCKED.')
    this.audio.tone(880, .32, 'triangle')
    this.context.emit({ type: 'score', score: this.score })
  }
  private updateHUD() {
    if (!this.levelLabel) return
    this.levelLabel.setText(`DISTRICT ${String(this.level).padStart(2, '0')}`)
    this.livesLabel.setText(Array.from({ length: this.lives }, () => '◆').join('  ') || 'NO LIVES')
    this.statusLabel.setText(String(this.maze.pellets.size).padStart(3, '0'))
    if (this.progressBar) this.progressBar.width = this.empowered > 0 ? (this.empowered / 7.5) * 180 : 0
  }
  private getRunnerChoice(): Direction | null {
    const point = { x: this.runner.col, y: this.runner.row }
    if (this.desired && walkable(this.maze, { x: point.x + DELTA[this.desired].x, y: point.y + DELTA[this.desired].y })) return this.desired
    const old = this.runner.direction
    if (old && walkable(this.maze, { x: point.x + DELTA[old].x, y: point.y + DELTA[old].y })) return old
    return null
  }
  private getRivalChoice(rival: Rival): Direction | null {
    const point = { x: rival.col, y: rival.row }
    const reverse = rival.direction ? OPPOSITE[rival.direction] : undefined
    const scared = this.empowered > 0
    const scatter = Math.floor(this.time / 12) % 4 === 3
    let target = this.runnerTarget()
    if (scatter) target = rival.style.corner
    else if (scared) {
      target = { x: rival.col + (rival.col - this.runner.col) * 2, y: rival.row + (rival.row - this.runner.row) * 2 }
    } else if (rival.style.personality === 1) {
      const delta = this.runner.direction ? DELTA[this.runner.direction] : { x: 0, y: 0 }
      target = { x: target.x + delta.x * 4, y: target.y + delta.y * 4 }
    } else if (rival.style.personality === 2) {
      const offset = this.runner.direction ? DELTA[this.runner.direction] : { x: 0, y: 0 }
      target = { x: target.x - offset.x * 3, y: target.y - offset.y * 3 }
    } else if (rival.style.personality === 3) {
      const distance = Math.abs(rival.col - this.runner.col) + Math.abs(rival.row - this.runner.row)
      if (distance < 7) target = rival.style.corner
    }
    return routeTowards(this.maze, point, alignedTarget(target), reverse)
  }
  private runnerTarget() {
    return {
      x: this.runner.col + (this.runner.direction ? DELTA[this.runner.direction].x * this.runner.progress : 0),
      y: this.runner.row + (this.runner.direction ? DELTA[this.runner.direction].y * this.runner.progress : 0),
    }
  }
  private move(mover: Mover, dt: number, speed: number, decide: () => Direction | null, onCell?: () => void) {
    let left = speed * dt
    while (left > 0.0001) {
      if (mover.progress === 0) {
        const next = decide()
        if (!next) { mover.direction = null; break }
        mover.direction = next
      }
      const direction = mover.direction
      if (!direction) break
      const amount = Math.min(left, 1 - mover.progress)
      mover.progress += amount
      left -= amount
      const from = CENTER({ x: mover.col, y: mover.row })
      mover.node.setPosition(from.x + DELTA[direction].x * TILE * mover.progress, from.y + DELTA[direction].y * TILE * mover.progress)
      if (mover.progress >= .99999) {
        mover.col += DELTA[direction].x
        mover.row += DELTA[direction].y
        mover.progress = 0
        this.place(mover)
        onCell?.()
        if (!this.running) break
      }
    }
  }
  private collected() {
    const key = keyOf({ x: this.runner.col, y: this.runner.row })
    const kind = this.maze.pellets.get(key)
    if (!kind) return
    this.maze.pellets.delete(key)
    this.dots.get(key)?.destroy()
    this.dots.delete(key)
    if (kind === 'boost') {
      this.score += 75
      this.empowered = 7.5
      this.combo = 0
      this.audio.tone(700, .23, 'sine')
      this.speech.setText('POWER UP! THE HUNTERS BECOME THE HUNTED.')
      this.cameras.main.flash(160, 255, 213, 95)
    } else {
      this.score += 10
      if (this.maze.pellets.size % 3 === 0) this.audio.tone(440 + this.maze.pellets.size % 6 * 37, .04, 'sine', .28)
    }
    this.context.emit({ type: 'score', score: this.score })
    if (this.maze.pellets.size === 0) this.nextLevel()
    else this.updateHUD()
  }
  private showSpark(x: number, y: number, color: number) {
    const circle = this.add.circle(x, y, 8, color, .8).setDepth(12)
    this.tweens.add({ targets: circle, scale: 3.2, alpha: 0, duration: 240, onComplete: () => circle.destroy() })
  }
  private collisions() {
    if (!this.running) return
    const x = this.runner.node.x
    const y = this.runner.node.y
    for (const rival of this.rivals) {
      if (rival.respawnIn > 0 || this.time < rival.releaseAt) continue
      const dx = x - rival.node.x
      const dy = y - rival.node.y
      if (dx * dx + dy * dy > (TILE * .69) ** 2) continue
      if (this.empowered > 0) {
        this.combo++
        this.score += 200 * Math.min(8, 2 ** (this.combo - 1))
        this.context.emit({ type: 'score', score: this.score })
        this.audio.tone(900 + this.combo * 70, .18, 'triangle')
        this.showSpark(rival.node.x, rival.node.y, 0xbeff8e)
        rival.respawnIn = 4
        rival.node.setVisible(false)
        continue
      }
      if (this.invincible > 0) continue
      this.lives--
      this.invincible = 2.7
      this.intro = 1.2
      this.empowered = 0
      this.combo = 0
      this.audio.tone(135, .45, 'sawtooth', .7)
      this.cameras.main.shake(160, .003)
      this.showSpark(x, y, 0xff6d8c)
      if (this.lives <= 0) {
        this.running = false
        this.speech.setText('RUN OVER — COME BACK STRONGER.')
        this.context.emit({ type: 'ended', score: this.score, reason: 'game-over' })
      } else {
        this.resetPositions()
        this.speech.setText('STAY IN THE GAME. YOU GOT THIS.')
      }
      this.updateHUD()
      return
    }
  }
  setAction(action: PlayerAction, pressed: boolean) {
    const keyDirection: Partial<Record<PlayerAction, Direction>> = {
      MOVE_LEFT: 'left', MOVE_RIGHT: 'right', MOVE_UP: 'up', MOVE_DOWN: 'down',
    }
    const direction = keyDirection[action]
    if (!direction) return
    if (pressed) {
      this.held.add(direction)
      this.desired = direction
      // Responsive reverse movement, even between intersections.
      if (this.runner?.direction === OPPOSITE[direction] && this.runner.progress > 0) {
        const old = this.runner.direction
        this.runner.col += DELTA[old].x
        this.runner.row += DELTA[old].y
        this.runner.progress = 1 - this.runner.progress
        this.runner.direction = direction
      }
    } else {
      this.held.delete(direction)
      if (this.desired === direction && this.held.size) this.desired = [...this.held].at(-1) ?? null
    }
  }
  update(_time: number, delta: number) {
    if (!this.prepared || !this.running) return
    const dt = Math.min(delta / 1000, .05)
    this.time += dt
    this.pulse += dt
    this.intro = Math.max(0, this.intro - dt)
    this.empowered = Math.max(0, this.empowered - dt)
    this.invincible = Math.max(0, this.invincible - dt)
    this.trailTime += dt
    if (this.intro > 0) {
      this.runner.node.setAlpha(.65 + Math.sin(this.pulse * 12) * .25)
      this.updateHUD()
      return
    }
    this.runner.node.setAlpha(this.invincible > 0 ? .75 + Math.sin(this.pulse * 17) * .21 : 1)
    const speed = 5.8 + Math.min(1.1, (this.level - 1) * .17)
    this.move(this.runner, dt, speed, () => this.getRunnerChoice(), () => this.collected())
    if (this.trailTime >= .12 && this.runner.direction && this.invincible <= 0) {
      this.trailTime = 0
      const dot = this.add.circle(this.runner.node.x, this.runner.node.y, 3.5, 0xb4ffa1, .33).setDepth(7)
      this.tweens.add({ targets: dot, alpha: 0, scale: .1, duration: 280, onComplete: () => dot.destroy() })
    }
    for (const rival of this.rivals) {
      if (rival.respawnIn > 0) {
        rival.respawnIn -= dt
        if (rival.respawnIn <= 0) {
          const spawn = this.maze.enemies[RIVALS.indexOf(rival.style)]
          rival.col = spawn.x
          rival.row = spawn.y
          rival.direction = null
          rival.progress = 0
          rival.releaseAt = this.time + .8
          rival.node.setVisible(true).setAlpha(1)
          this.place(rival)
        }
        continue
      }
      if (this.time < rival.releaseAt) continue
      rival.node.setAlpha(this.empowered > 0 ? .5 + Math.sin(this.pulse * 10) * .2 : 1)
      this.move(rival, dt, (this.empowered > 0 ? 3.2 : 4 + Math.min(1.35, this.level * .15)) + rival.style.personality * .085, () => this.getRivalChoice(rival))
    }
    this.collisions()
    this.progressBar.width = (this.empowered / 7.5) * 180
    this.cameraGlow.setAlpha(this.empowered > 0 ? .055 + Math.sin(this.pulse * 7) * .018 : .008)
  }
  stop() {
    this.running = false
    this.held.clear()
    this.desired = null
  }
  begin() { this.startGame() }
}

export const mount: GameModule['mount'] = async (context) => {
  const audio = createAudio(context.sound)
  const scene = new KasiMazeScene(context, audio)
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: context.parent,
    width: WIDTH, height: HEIGHT,
    backgroundColor: '#080c18',
    render: { antialias: true, pixelArt: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: WIDTH, height: HEIGHT },
    fps: { target: 60, min: 30 },
    scene: [scene],
  })
  const unsubscribe = context.input.subscribe(event => {
    if (event.playerId !== context.playerId || event.repeated) return
    scene.setAction(event.action, event.phase === 'pressed')
  })
  let destroyed = false
  return {
    start() { if (!destroyed) scene.begin() },
    pause() { if (!destroyed) scene.scene.pause() },
    resume() { if (!destroyed) scene.scene.resume() },
    restart() { if (!destroyed) { scene.scene.resume(); scene.begin() } },
    destroy() {
      if (destroyed) return
      destroyed = true
      unsubscribe()
      scene.stop()
      audio.dispose()
      game.destroy(true)
    },
  }
}
