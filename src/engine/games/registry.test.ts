import { describe, expect, it } from 'vitest'
import { games, gameById, playableGames } from './registry'

describe('game registry contract', () => {
  it('has unique, navigable, complete metadata', () => {
    expect(games.length).toBeGreaterThanOrEqual(3)
    expect(new Set(games.map(g => g.id)).size).toBe(games.length)
    for (const game of games) {
      expect(game.id).toMatch(/^[a-z0-9-]+$/)
      expect(game.title.trim()).not.toBe('')
      expect(game.description.trim()).not.toBe('')
      expect(game.players.min).toBeGreaterThanOrEqual(1)
      expect(game.players.max).toBeGreaterThanOrEqual(game.players.min)
      expect(game.artwork.cover).toBeTruthy()
      expect(game.artwork.hero).toBeTruthy()
      expect(game.instructions.length).toBeGreaterThan(0)
      expect(gameById(game.id)).toBe(game)
    }
  })

  it('never exposes an unimplemented game as playable', () => {
    const playable = playableGames()
    expect(playable.map(g => g.id)).toContain('neon-dodge')
    expect(playable.every(g => g.status === 'playable' && typeof g.load === 'function')).toBe(true)
    for (const upcoming of games.filter(g => g.status === 'coming-soon')) {
      expect(upcoming.load).toBeUndefined()
      expect(playable.map(g => g.id)).not.toContain(upcoming.id)
    }
  })

  it('keeps upcoming multiplayer metadata honest', () => {
    const fighters = gameById('kasi-fighters')
    expect(fighters?.status).toBe('coming-soon')
    expect(fighters?.players.min).toBe(2)
    expect(fighters?.category).toContain('multiplayer')
  })
})
