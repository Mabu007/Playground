export type SessionState = 'IDLE' | 'READY' | 'ACTIVE' | 'PAUSED' | 'ENDED'
export type EndReason = 'game-over' | 'completed' | 'timeout' | 'exit' | 'restart' | 'error'
export interface SessionSnapshot {
  id: string
  state: SessionState
  gameId: string | null
  playerIds: string[]
  startedAt: number | null
  elapsedMs: number
  remainingMs: number | null
  demoDurationMs: number | null
  endReason: EndReason | null
}
export class SessionManager {
  private state: SessionState = 'IDLE'
  private id = ''
  private gameId: string | null = null
  private playerIds: string[] = []
  private startWall: number | null = null
  private startClock = 0
  private pausedAt: number | null = null
  private pauseTotal = 0
  private endedElapsed = 0
  private duration: number | null = null
  private reason: EndReason | null = null
  constructor(private now = () => performance.now(), private wallNow = () => Date.now()) {}
  prepare(gameId: string, players: string[], demoMinutes: number | null) {
    if (this.state === 'ACTIVE' || this.state === 'PAUSED') throw new Error('Session already active')
    this.id = `session-${this.wallNow()}-${Math.random().toString(36).slice(2, 8)}`
    this.gameId = gameId
    this.playerIds = [...players]
    this.state = 'READY'
    this.startWall = null
    this.startClock = 0
    this.pausedAt = null
    this.pauseTotal = 0
    this.endedElapsed = 0
    this.duration = demoMinutes === null ? null : demoMinutes * 60_000
    this.reason = null
  }
  start() {
    if (this.state !== 'READY') throw new Error('Session not ready')
    this.startClock = this.now()
    this.startWall = this.wallNow()
    this.state = 'ACTIVE'
  }
  pause() {
    if (this.state !== 'ACTIVE') return
    this.pausedAt = this.now()
    this.state = 'PAUSED'
  }
  resume() {
    if (this.state !== 'PAUSED' || this.pausedAt === null) return
    this.pauseTotal += this.now() - this.pausedAt
    this.pausedAt = null
    this.state = 'ACTIVE'
  }
  elapsedMs() {
    if (this.state === 'READY' || this.state === 'IDLE') return 0
    if (this.state === 'ENDED') return this.endedElapsed
    return Math.max(0, (this.pausedAt ?? this.now()) - this.startClock - this.pauseTotal)
  }
  isExpired() { return this.duration !== null && this.state === 'ACTIVE' && this.elapsedMs() >= this.duration }
  end(reason: EndReason) {
    if (this.state === 'ENDED' || this.state === 'IDLE') return
    this.endedElapsed = this.elapsedMs()
    this.reason = reason
    this.pausedAt = null
    this.state = 'ENDED'
  }
  snapshot(): SessionSnapshot {
    const elapsedMs = this.elapsedMs()
    return {
      id: this.id, state: this.state, gameId: this.gameId, playerIds: [...this.playerIds],
      startedAt: this.startWall, elapsedMs,
      remainingMs: this.duration === null ? null : Math.max(0, this.duration - elapsedMs),
      demoDurationMs: this.duration, endReason: this.reason,
    }
  }
}
export const sessionManager = new SessionManager()
