import type { ComponentType } from 'react'
import type { InputRouter, PlayerActionEvent } from '../input/InputRouter'

export type GameStatus = 'playable' | 'coming-soon'
export type GameInput = 'keyboard' | 'gamepad' | 'phone'
export type GameCategory = 'featured' | 'quick' | 'multiplayer' | 'upcoming'
export interface GameRunStats {
  characterId?: string
  district?: number
  beatsCollected?: number
  rivalsTagged?: number
}
export interface GameEntryProps {
  onStart(characterId: string): void
  onExit(): void
  sound: { volume: number; muted: boolean; musicVolume?: number }
}
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
  controls: { label: string; keys: string[] }[]
  load?: () => Promise<GameModule>
  /** Optional game-owned entry screen, lazily loaded outside the console bundle. */
  entry?: () => Promise<{ default: ComponentType<GameEntryProps> }>
}
export type GameEvent =
  | { type: 'ready' }
  | { type: 'playing' }
  | { type: 'score'; score: number }
  | { type: 'stats'; stats: GameRunStats }
  | { type: 'ended'; score: number; reason: 'game-over' | 'completed'; stats?: GameRunStats }
export interface GameContext {
  parent: HTMLElement
  input: InputRouter
  playerId: string
  emit: (event: GameEvent) => void
  sound: { volume: number; muted: boolean; musicVolume?: number }
  characterId?: string
  reducedMotion?: boolean
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
