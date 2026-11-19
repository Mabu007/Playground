import { describe, it, expect } from 'vitest'
import { SessionManager } from './SessionManager'
describe('monotonic session engine', () => {
  it('does not bill elapsed time while paused', () => {
    let now = 1000
    const manager = new SessionManager(() => now, () => 100)
    manager.prepare('neon-dodge', ['player-1'], 1)
    manager.start()
    now += 20_000
    manager.pause()
    now += 100_000
    expect(manager.snapshot().elapsedMs).toBe(20_000)
    manager.resume()
    now += 39_999
    expect(manager.isExpired()).toBe(false)
    now += 1
    expect(manager.isExpired()).toBe(true)
    manager.end('timeout')
    expect(manager.snapshot().endReason).toBe('timeout')
    expect(manager.snapshot().elapsedMs).toBe(60_000)
    now += 100_000
    expect(manager.snapshot().elapsedMs).toBe(60_000)
  })
  it('supports reusable sessions after one ends', () => {
    let now = 0
    const manager = new SessionManager(() => now)
    manager.prepare('a', ['p1'], null)
    manager.start()
    now = 500
    manager.end('exit')
    manager.prepare('b', ['p1'], 3)
    manager.start()
    expect(manager.snapshot().gameId).toBe('b')
    expect(manager.snapshot().remainingMs).toBe(180_000)
  })
})
