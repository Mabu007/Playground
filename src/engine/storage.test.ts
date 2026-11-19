import { describe, it, expect } from 'vitest'
import { defaultData, withPlay, withSession } from './storage'
describe('local progress', () => {
  it('increments plays and keeps best score', () => {
    let data = withPlay(defaultData(), 'neon-dodge')
    data = withSession(data, { id: 'a', gameId: 'neon-dodge', score: 20, elapsedMs: 1000, endedAt: 123, reason: 'game-over' })
    data = withSession(data, { id: 'b', gameId: 'neon-dodge', score: 10, elapsedMs: 1200, endedAt: 124, reason: 'exit' })
    expect(data.progress.totalPlays).toBe(1)
    expect(data.progress.bestScores['neon-dodge']).toBe(20)
    expect(data.progress.sessions).toHaveLength(2)
  })
})
