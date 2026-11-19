import { describe, it, expect } from 'vitest'
import { InputRouter } from './InputRouter'
describe('normalized input', () => {
  it('passes player and release events, and cleans listeners', () => {
    const router = new InputRouter()
    const received: string[] = []
    const off = router.subscribe(e => received.push(`${e.playerId}:${e.action}:${e.phase}`))
    router.dispatch({ playerId: 'player-2', action: 'MOVE_LEFT', phase: 'pressed', source: 'test', repeated: false })
    router.dispatch({ playerId: 'player-2', action: 'MOVE_LEFT', phase: 'released', source: 'test', repeated: false })
    off()
    router.dispatch({ playerId: 'player-2', action: 'MOVE_LEFT', phase: 'pressed', source: 'test', repeated: false })
    expect(received).toEqual(['player-2:MOVE_LEFT:pressed', 'player-2:MOVE_LEFT:released'])
    expect(router.listenerCount).toBe(0)
  })
})
