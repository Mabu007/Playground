import { describe, it, expect } from 'vitest'
import { canTransition, assertTransition } from './machine'
describe('console state machine', () => {
  it('allows an intentional play / pause / end / exit cycle', () => {
    expect(canTransition('ATTRACT', 'LOADING')).toBe(true)
    expect(canTransition('LOADING', 'PLAYING')).toBe(true)
    expect(canTransition('PLAYING', 'PAUSED')).toBe(true)
    expect(canTransition('PAUSED', 'PLAYING')).toBe(true)
    expect(canTransition('PLAYING', 'SESSION_ENDED')).toBe(true)
    expect(canTransition('SESSION_ENDED', 'ATTRACT')).toBe(true)
  })
  it('rejects impossible transitions', () => {
    expect(canTransition('ATTRACT', 'PAUSED')).toBe(false)
    expect(() => assertTransition('ATTRACT', 'PAUSED')).toThrow()
  })
})
