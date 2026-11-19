import { describe, expect, it } from 'vitest'
import { AudioDirector } from './audio'
describe('Kasi Maze audio lifecycle', () => {
  it('can be disposed without browser audio APIs', () => {
    const director = new AudioDirector({ volume: .6, muted: false })
    director.mode('menu')
    director.pause()
    director.configure({ volume: .2, muted: true })
    director.resume()
    director.effect('pickup')
    director.dispose()
    director.dispose()
    expect(true).toBe(true)
  })
})
