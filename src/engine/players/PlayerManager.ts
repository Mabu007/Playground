export interface LocalPlayer {
  id: string
  displayName: string
  inputDevice: string | null
  connected: boolean
  ready: boolean
  sessionId: string | null
}
export class PlayerManager {
  private players = new Map<string, LocalPlayer>()
  constructor() {
    this.players.set('player-1', { id: 'player-1', displayName: 'Player One', inputDevice: 'keyboard', connected: true, ready: true, sessionId: null })
  }
  all(): LocalPlayer[] { return [...this.players.values()].map(player => ({ ...player })) }
  assignSession(playerId: string, sessionId: string | null) {
    const player = this.players.get(playerId)
    if (!player) throw new Error('Unknown player')
    player.sessionId = sessionId
  }
  register(player: LocalPlayer) {
    if (this.players.has(player.id)) throw new Error('Player already registered')
    this.players.set(player.id, { ...player })
  }
  disconnect(playerId: string) {
    const player = this.players.get(playerId)
    if (player) { player.connected = false; player.ready = false }
  }
}
export const playerManager = new PlayerManager()
