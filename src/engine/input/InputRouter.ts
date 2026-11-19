export type PlayerAction =
  | 'MOVE_LEFT' | 'MOVE_RIGHT' | 'MOVE_UP' | 'MOVE_DOWN'
  | 'PRIMARY_ACTION' | 'SECONDARY_ACTION' | 'START'
  | 'PAUSE' | 'CONFIRM' | 'BACK' | 'RESTART' | 'TOGGLE_FULLSCREEN'
export type InputPhase = 'pressed' | 'released'
export interface PlayerActionEvent {
  playerId: string
  action: PlayerAction
  phase: InputPhase
  source: string
  repeated: boolean
}
export type ActionListener = (event: PlayerActionEvent) => void
export interface InputAdapter {
  readonly source: string
  start(router: InputRouter): void
  stop(): void
}
export class InputRouter {
  private listeners = new Set<ActionListener>()
  subscribe(listener: ActionListener): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  dispatch(event: PlayerActionEvent): void {
    for (const listener of [...this.listeners]) listener(event)
  }
  get listenerCount(): number { return this.listeners.size }
}
