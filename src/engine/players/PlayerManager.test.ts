import { describe, expect, it } from 'vitest'
import { PlayerManager } from './PlayerManager'

describe('local player assignments', () => {
  it('begins with one connected keyboard player', () => {
    const players = new PlayerManager()
    expect(players.all()).toEqual([{
      id: 'player-1',
      displayName: 'Player One',
      inputDevice: 'keyboard',
      connected: true,
      ready: true,
      sessionId: null,
    }])
  })

  it('assigns and releases sessions without exposing mutable player state', () => {
    const players = new PlayerManager()
    players.assignSession('player-1', 'session-42')
    const snapshot = players.all()
    expect(snapshot[0].sessionId).toBe('session-42')
    snapshot[0].sessionId = 'mutated'
    expect(players.all()[0].sessionId).toBe('session-42')
    players.assignSession('player-1', null)
    expect(players.all()[0].sessionId).toBeNull()
  })

  it('supports future player records but rejects duplicate IDs', () => {
    const players = new PlayerManager()
    const next = { id: 'player-2', displayName: 'Player Two', inputDevice: 'phone', connected: true, ready: false, sessionId: null }
    players.register(next)
    expect(players.all()).toHaveLength(2)
    expect(() => players.register(next)).toThrow()
    players.disconnect('player-2')
    expect(players.all()[1]).toMatchObject({ connected: false, ready: false })
  })
})
