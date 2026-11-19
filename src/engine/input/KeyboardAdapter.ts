import type { InputAdapter, InputRouter, PlayerAction } from './InputRouter'

const mapping: Record<string, PlayerAction> = {
  ArrowLeft: 'MOVE_LEFT', a: 'MOVE_LEFT',
  ArrowRight: 'MOVE_RIGHT', d: 'MOVE_RIGHT',
  ArrowUp: 'MOVE_UP', w: 'MOVE_UP',
  ArrowDown: 'MOVE_DOWN', s: 'MOVE_DOWN',
  Enter: 'CONFIRM', ' ': 'PRIMARY_ACTION',
  Escape: 'BACK', p: 'PAUSE', P: 'PAUSE',
  f: 'TOGGLE_FULLSCREEN', F: 'TOGGLE_FULLSCREEN',
  r: 'RESTART', R: 'RESTART',
}
export class KeyboardAdapter implements InputAdapter {
  readonly source = 'keyboard'
  private keys = new Set<string>()
  private router: InputRouter | null = null
  constructor(private playerId = 'player-1') {}
  start(router: InputRouter): void {
    if (this.router) this.stop()
    this.router = router
    window.addEventListener('keydown', this.onDown)
    window.addEventListener('keyup', this.onUp)
    window.addEventListener('blur', this.onBlur)
  }
  stop(): void {
    this.onBlur()
    window.removeEventListener('keydown', this.onDown)
    window.removeEventListener('keyup', this.onUp)
    window.removeEventListener('blur', this.onBlur)
    this.router = null
  }
  private blocked = (event: KeyboardEvent) => {
    const el = event.target
    return el instanceof HTMLElement && !!el.closest('input, select, textarea, [contenteditable="true"], [data-native-keys]')
  }
  private normalized = (key: string) => key.length === 1 ? key.toLowerCase() : key
  private onDown = (event: KeyboardEvent) => {
    if (this.blocked(event) || event.ctrlKey || event.metaKey || event.altKey) return
    const key = this.normalized(event.key)
    const action = mapping[key]
    if (!action) return
    event.preventDefault()
    const repeated = this.keys.has(key)
    this.keys.add(key)
    this.router?.dispatch({ playerId: this.playerId, action, phase: 'pressed', source: this.source, repeated })
  }
  private onUp = (event: KeyboardEvent) => {
    const key = this.normalized(event.key)
    const action = mapping[key]
    if (!action || !this.keys.has(key)) return
    this.keys.delete(key)
    this.router?.dispatch({ playerId: this.playerId, action, phase: 'released', source: this.source, repeated: false })
  }
  private onBlur = () => {
    for (const key of this.keys) {
      const action = mapping[key]
      this.router?.dispatch({ playerId: this.playerId, action, phase: 'released', source: this.source, repeated: false })
    }
    this.keys.clear()
  }
}
