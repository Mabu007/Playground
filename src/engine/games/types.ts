import type { InputRouter, PlayerActionEvent } from '../input/InputRouter'

export type GameStatus = 'playable' | 'coming-soon'
export type GameInput = 'keyboard' | 'gamepad' | 'phone'
export type GameCategory = 'featured' | 'quick' | 'multiplayer' | 'upcoming'

export interface GameInfo {
  id: string
  title: string
  eyebrow: string
  tagline: string
  description: string
  genre: string
  tags: string[]
  players: { min: number; max: number }
  inputMethods: GameInput[]
  category: GameCategory[]
  status: GameStatus
  artwork: { cover: string; hero: string }
  instructions: string[]
  load?: () => Promise<GameModule>
}
export type GameEvent =
  | { type: 'ready' }
  | { type: 'score'; score: number }
  | { type: 'ended'; score: number; reason: 'game-over' | 'completed' }
export interface GameContext {
  parent: HTMLElement
  input: InputRouter
  playerId: string
  emit: (event: GameEvent) => void
  sound: { volume: number; muted: boolean }
}
export interface GameInstance {
  start(): void
  pause(): void
  resume(): void
  restart(): void
  destroy(): void
}
export interface GameModule { mount(context: GameContext): Promise<GameInstance> }
export type GameInputHandler = (event: PlayerActionEvent) => void
