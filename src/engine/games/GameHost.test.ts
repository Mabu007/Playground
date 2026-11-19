import { describe, it, expect } from 'vitest'
import { GameHost } from './GameHost'
import { InputRouter } from '../input/InputRouter'
import type { GameInfo, GameInstance } from './types'
const ctx = { parent: {} as HTMLElement, playerId: 'player-1', input: new InputRouter(), emit: () => {}, sound: { volume: 0.5, muted: true } }
const metadata: Omit<GameInfo, 'load'> = {
  id: 'test', title: 'Test', eyebrow: '', tagline: '', description: '', genre: '', tags: [],
  players: { min: 1, max: 1 }, inputMethods: ['keyboard'], category: ['quick'], status: 'playable',
  artwork: { cover: '', hero: '' }, instructions: [], controls: [],
}
describe('game host lifecycle', () => {
  it('refuses duplicate launches; destroys on exit; remounts safely', async () => {
    let starts = 0
    let destroys = 0
    const instance: GameInstance = { start: () => { starts++ }, pause: () => {}, resume: () => {}, restart: () => {}, destroy: () => { destroys++ } }
    const game: GameInfo = { ...metadata, load: async () => ({ mount: async () => instance }) }
    const host = new GameHost()
    expect(await host.launch(game, ctx)).toBe(true)
    expect(await host.launch(game, ctx)).toBe(false)
    expect(host.activeCount).toBe(1)
    host.destroy()
    expect(host.activeCount).toBe(0)
    expect(await host.launch(game, ctx)).toBe(true)
    host.destroy()
    expect(starts).toBe(2)
    expect(destroys).toBe(2)
  })
  it('invalidates an in-flight lazy load on exit', async () => {
    let resolve!: (value: { mount: () => Promise<GameInstance> }) => void
    const game: GameInfo = { ...metadata, load: () => new Promise(r => { resolve = r }) }
    const host = new GameHost()
    const pending = host.launch(game, ctx)
    host.destroy()
    resolve({ mount: async () => ({ start() {}, pause() {}, resume() {}, restart() {}, destroy() {} }) })
    expect(await pending).toBe(false)
    expect(host.activeCount).toBe(0)
  })
})
